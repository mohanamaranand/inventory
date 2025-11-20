"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useInventory } from "@/context/inventory-context";
import { useToast } from "@/hooks/use-toast";
import { Wrench, CheckCircle, AlertTriangle } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "../ui/badge";

const formSchema = z.object({
  modelId: z.string({ required_error: "Please select a vehicle model." }),
  chassisNumber: z.string().min(1, "Chassis number is required."),
  motorNumber: z.string().min(1, "Motor number is required."),
});

export function AssembleVehicle() {
  const { vehicleModels, assembleVehicle, getItemByStdCode } = useInventory();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const selectedModelId = form.watch("modelId");
  const selectedModel = useMemo(
    () => vehicleModels.find((m) => m.id === selectedModelId),
    [selectedModelId, vehicleModels]
  );

  const partsAvailability = useMemo(() => {
    if (!selectedModel) return [];
    return selectedModel.parts.map((part) => {
      const inventoryItem = getItemByStdCode(part.itemStdCode);
      const available = inventoryItem ? inventoryItem.quantity : 0;
      return {
        ...part,
        productName: inventoryItem?.productName || "Unknown Item",
        available,
        sufficient: available >= part.quantity,
      };
    });
  }, [selectedModel, getItemByStdCode]);
  
  const canAssemble = partsAvailability.every(p => p.sufficient);

  function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      assembleVehicle({ ...values, assemblyDate: new Date() });
      toast({
        title: "Vehicle Assembled!",
        description: `A new ${selectedModel?.name} has been built. Inventory updated.`,
      });
      form.reset({ modelId: values.modelId, chassisNumber: "", motorNumber: ""});
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Assembly Failed",
        description: error.message,
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assemble a New Vehicle</CardTitle>
        <CardDescription>
          Select a model, provide vehicle details, and assemble it. This will
          deduct the required parts from your inventory.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="modelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Model</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a model to assemble" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vehicleModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedModel && (
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg">Required Parts</CardTitle>
                  <CardDescription>
                    Check if you have enough parts in stock to assemble this model.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {partsAvailability.map((part, index) => (
                      <li key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                           {part.sufficient ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}
                          <span>{part.productName} ({part.itemStdCode})</span>
                        </div>
                        <Badge variant={part.sufficient ? "secondary" : "destructive"}>
                          Required: {part.quantity} / Available: {part.available}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="chassisNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chassis Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter chassis number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="motorNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motor Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter motor number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={!selectedModel || !canAssemble}>
              <Wrench className="mr-2 h-4 w-4" />
              Assemble Vehicle
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
