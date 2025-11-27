
"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateModelForm } from "@/components/assembly/create-model-form";
import { AssembleVehicle } from "@/components/assembly/assemble-vehicle";
import { useInventory } from "@/context/inventory-context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { VehicleModel } from "@/lib/types";

export default function AssemblyPage() {
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const { vehicleModels, addVehicleModel, getItemByStdCode } = useInventory();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleOpenSheet = (modelId: string | null = null) => {
    setSelectedModelId(modelId);
    setSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setSheetOpen(false);
    setSelectedModelId(null);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        const modelsToCreate = new Map<string, Omit<VehicleModel, "id">>();
        let invalidPartCodes: string[] = [];

        json.forEach((row) => {
          const modelName = row["Model Name"] || row["modelName"];
          const itemStdCode = row["Item STD Code"] || row["itemStdCode"];
          const quantity = Number(row["Quantity"] || row["quantity"]);

          if (!modelName || !itemStdCode || isNaN(quantity) || quantity <= 0) {
            return; // Skip invalid rows
          }
          
          if (!getItemByStdCode(itemStdCode)) {
            if (!invalidPartCodes.includes(itemStdCode)) {
              invalidPartCodes.push(itemStdCode);
            }
            return;
          }

          if (!modelsToCreate.has(modelName)) {
            modelsToCreate.set(modelName, { name: modelName, parts: [] });
          }

          const model = modelsToCreate.get(modelName)!;
          model.parts.push({ itemStdCode: String(itemStdCode), quantity });
        });

        if (invalidPartCodes.length > 0) {
          toast({
            variant: "destructive",
            title: "Import Failed",
            description: `The following item codes do not exist in your inventory: ${invalidPartCodes.join(", ")}.`,
          });
          return;
        }

        if (modelsToCreate.size === 0) {
          toast({
            variant: "destructive",
            title: "Import Failed",
            description: "No valid models found in the file.",
          });
          return;
        }
        
        modelsToCreate.forEach((model) => {
          addVehicleModel(model);
        });

        toast({
          title: "Import Complete",
          description: `${modelsToCreate.size} new vehicle models have been added.`,
        });

      } catch (error) {
        console.error("Error processing Excel file:", error);
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: "There was an error processing the Excel file. Please ensure it's a valid .xlsx file.",
        });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <>
      <Header title="Vehicle Assembly">
        <Button onClick={() => handleOpenSheet()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create New Model
        </Button>
      </Header>

      <CreateModelForm
        open={isSheetOpen}
        onOpenChange={setSheetOpen}
        onFormSubmit={handleCloseSheet}
        modelId={selectedModelId}
      />

      <Tabs defaultValue="assemble">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assemble">Assemble Vehicle</TabsTrigger>
          <TabsTrigger value="models">Vehicle Models</TabsTrigger>
        </TabsList>
        <TabsContent value="assemble">
          <AssembleVehicle />
        </TabsContent>
        <TabsContent value="models">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Vehicle Models</CardTitle>
                  <CardDescription>
                    Browse and manage your saved vehicle models.
                  </CardDescription>
                </div>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".xlsx, .xls"
                  />
                  <Button variant="outline" onClick={handleImportClick}>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Models
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {vehicleModels.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <div className="grid gap-4 md:grid-cols-2">
                    {vehicleModels.map((model) => (
                      <Card key={model.id} className="flex flex-col">
                        <CardHeader>
                          <CardTitle className="flex justify-between items-center">
                            {model.name}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenSheet(model.id)}
                            >
                              Edit
                            </Button>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow">
                          <p className="text-sm font-medium mb-2">Required Parts:</p>
                          <div className="space-y-2">
                            {model.parts.map((part, index) => (
                              <div
                                key={index}
                                className="flex justify-between items-center text-sm"
                              >
                                <span>{part.itemStdCode}</span>
                                <Badge variant="secondary">
                                  Qty: {part.quantity}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    No vehicle models created yet.
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => handleOpenSheet()}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create a Model
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
