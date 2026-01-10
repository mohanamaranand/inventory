
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useInventory } from "@/context/inventory-context-firebase";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  modelId: z.string().min(1, "Please select a vehicle model."),
  chassisNumber: z.string().min(1, "Chassis number is required."),
  motorNumber: z.string().min(1, "Motor number is required."),
});

export function AssembleVehicle() {
  const { vehicleModels, assembleVehicle } = useInventory();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      modelId: "",
      chassisNumber: "",
      motorNumber: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const selectedModel = vehicleModels.find(m => m.id === values.modelId);
    if (!selectedModel) {
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Selected vehicle model not found. Please refresh and try again.",
        });
        return;
    }

    setIsSubmitting(true);

    try {
      // The new assembleVehicle function handles everything transactionally
      await assembleVehicle({
        ...values, 
        modelName: selectedModel.name, // Add the modelName to the payload
      });
      
      toast({
        variant: "default",
        title: "Assembly Successful",
        description: `${selectedModel.name} with chassis ${values.chassisNumber} has been assembled.`,
      });
      form.reset();
    } catch (error: any) {
      // The backend now returns specific errors (e.g., for duplicates)
      toast({
        variant: "destructive",
        title: "Assembly Failed",
        description: error.message || "Could not assemble the vehicle.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assemble a New Vehicle</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="modelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Model</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a model" />
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
            <FormField
              control={form.control}
              name="chassisNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chassis Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter chassis number" {...field} disabled={isSubmitting} />
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
                    <Input placeholder="Enter motor number" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Assembling...
                </>
              ) : (
                'Assemble Vehicle'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
