"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
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

export default function AssemblyPage() {
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const { vehicleModels } = useInventory();

  const handleOpenSheet = (modelId: string | null = null) => {
    setSelectedModelId(modelId);
    setSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setSheetOpen(false);
    setSelectedModelId(null);
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
              <CardTitle>Vehicle Models</CardTitle>
              <CardDescription>
                Browse and manage your saved vehicle models.
              </CardDescription>
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
