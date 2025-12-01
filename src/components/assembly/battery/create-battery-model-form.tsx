
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { useInventory } from "@/context/inventory-context";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo } from "react";
import { PlusCircle, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const partSchema = z.object({
  itemStdCode: z.string().min(1, "Item STD Code is required."),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1."),
});

const formSchema = z.object({
  name: z.string().min(1, "Model name is required."),
  parts: z.array(partSchema).min(1, "At least one part is required."),
});

type CreateBatteryModelFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFormSubmit: () => void;
  modelId?: string | null;
};

export function CreateBatteryModelForm({
  open,
  onOpenChange,
  onFormSubmit,
  modelId,
}: CreateBatteryModelFormProps) {
  const { addBatteryModel, updateBatteryModel, getBatteryModel, inventory } = useInventory();
  const { toast } = useToast();

  const batteryParts = useMemo(
    () => inventory.filter((item) => item.itemCategory === "Battery Part"),
    [inventory]
  );

  const editingModel = modelId ? getBatteryModel(modelId) : null;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      parts: [{ itemStdCode: "", quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "parts",
  });

  useEffect(() => {
    if (editingModel) {
      form.reset(editingModel);
    } else {
      form.reset({
        name: "",
        parts: [{ itemStdCode: "", quantity: 1 }],
      });
    }
  }, [editingModel, form, open]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Validate that all itemStdCodes exist in inventory
    for (const part of values.parts) {
      const itemExists = inventory.some(
        (item) => item.itemStdCode === part.itemStdCode
      );
      if (!itemExists) {
        toast({
          variant: "destructive",
          title: "Invalid Item",
          description: `Item with STD Code "${part.itemStdCode}" does not exist in inventory.`,
        });
        return;
      }
    }

    if (editingModel && modelId) {
      updateBatteryModel(modelId, values);
      toast({
        title: "Model Updated",
        description: `"${values.name}" has been updated.`,
      });
    } else {
      addBatteryModel(values);
      toast({
        title: "Model Created",
        description: `"${values.name}" has been created.`,
      });
    }
    onFormSubmit();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full">
        <SheetHeader>
          <SheetTitle>
            {editingModel ? "Edit Battery Model" : "Create New Battery Model"}
          </SheetTitle>
          <SheetDescription>
            {editingModel
              ? "Update the details of the battery model."
              : "Define a new battery model by specifying its name and required parts."}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col h-full"
          >
            <ScrollArea className="flex-1 pr-6 -mr-6">
              <div className="space-y-6 py-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 72V 30Ah Lithium Ion"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>Required Parts</FormLabel>
                  <div className="space-y-4 mt-2">
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="flex items-end gap-2 p-3 border rounded-md"
                      >
                        <FormField
                          control={form.control}
                          name={`parts.${index}.itemStdCode`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel className="text-xs">
                                Battery Part
                              </FormLabel>
                               <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a part" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {batteryParts.map((part) => (
                                    <SelectItem key={part.id} value={part.itemStdCode}>
                                      {part.productName} ({part.itemStdCode})
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
                          name={`parts.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                Quantity
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="1"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => remove(index)}
                          disabled={fields.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => append({ itemStdCode: "", quantity: 1 })}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Part
                  </Button>
                </div>
              </div>
            </ScrollArea>
            <SheetFooter className="mt-auto pt-6">
              <SheetClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </SheetClose>
              <Button type="submit">Save Model</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
