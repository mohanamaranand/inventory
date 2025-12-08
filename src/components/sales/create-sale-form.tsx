
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useInventory } from "@/context/inventory-context-firebase";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2, ShoppingCart, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useRouter } from 'next/navigation';
import { useMemo, useState } from "react";

const saleItemSchema = z.object({
  itemId: z.string().min(1, "Please select an item."),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1."),
  unitPrice: z.coerce.number().min(0, "Price cannot be negative."),
});

const formSchema = z.object({
  customerId: z.string().min(1, "Please select a customer."),
  salesInvoiceNumber: z.string().min(1, "Sales invoice number is required."),
  date: z.date({ required_error: "A date of sale is required." }),
  items: z.array(saleItemSchema).min(1, "At least one item is required."),
});

export function CreateSaleForm() {
  const { customers, inventory, processSale } = useInventory();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: "",
      salesInvoiceNumber: "",
      date: new Date(),
      items: [{ itemId: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  const watchedItems = form.watch("items");
  const selectedItemIds = useMemo(() => new Set(watchedItems.map(item => item.itemId)), [watchedItems]);

  const availableInventory = useMemo(() => 
    inventory.filter(item => 
        (item.itemStatus === 'In Stock' || item.itemStatus === 'Assembled') 
        && item.quantity > 0
    ), [inventory]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    const { id: toastId } = toast({
      title: "Creating Sale...",
      description: "Processing your sales order, please wait.",
    });

    try {
      await processSale(values);
      toast({
        id: toastId,
        variant: "default",
        title: "Sale Created!",
        description: `Invoice ${values.salesInvoiceNumber} has been processed successfully.`,
      });
      router.push('/sales');
    } catch (error: any) {
      toast({
        id: toastId,
        variant: "destructive",
        title: "Sale Failed",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleItemChange = (itemId: string, index: number) => {
    const selectedItem = inventory.find(i => i.id === itemId);
    if (selectedItem) {
      form.setValue(`items.${index}.unitPrice`, selectedItem.unitPrice);
      form.setValue(`items.${index}.itemId`, itemId);
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Sales Order</CardTitle>
        <CardDescription>Select a customer, add items, and finalize the sale.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a dealer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
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
                name="salesInvoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sales Invoice No.</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., SALE-2024-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col pt-2">
                    <FormLabel>Date of Sale</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div>
              <FormLabel>Items</FormLabel>
              <div className="space-y-4 mt-2">
                {fields.map((field, index) => {
                   const selectedItemId = form.watch(`items.${index}.itemId`);
                   const selectedItem = inventory.find(i => i.id === selectedItemId);
                   const maxQuantity = selectedItem?.quantity ?? 0;
                   const filteredInventoryForThisRow = availableInventory.filter(item => !selectedItemIds.has(item.id) || item.id === selectedItemId);
                  return (
                    <div key={field.id} className="grid grid-cols-[1fr_120px_120px_auto] items-end gap-2 p-3 border rounded-md">
                      <FormField
                        control={form.control}
                        name={`items.${index}.itemId`}
                        render={({ field: formField }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="text-xs">Product</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                      "w-full justify-between",
                                      !formField.value && "text-muted-foreground"
                                    )}
                                  >
                                    {formField.value
                                      ? availableInventory.find(
                                          (item) => item.id === formField.value
                                        )?.productName
                                      : "Select product"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                  <CommandInput placeholder="Search product..." />
                                  <CommandList>
                                    <CommandEmpty>No product found.</CommandEmpty>
                                    <CommandGroup>
                                      {filteredInventoryForThisRow.map((item) => (
                                        <CommandItem
                                          value={`${item.productName} ${item.itemStdCode} ${item.itemCategory === 'Assembled Vehicle' ? item.productDetails : ''}`}
                                          key={item.id}
                                          onSelect={() => {
                                            handleItemChange(item.id, index);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              item.id === formField.value
                                                ? "opacity-100"
                                                : "opacity-0"
                                            )}
                                          />
                                          <span>{item.productName} ({item.itemStdCode}) - Stock: {item.quantity}</span>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Quantity</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="1" {...field} max={maxQuantity} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name={`items.${index}.unitPrice`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Unit Price</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="0.00" {...field} />
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
                  )
                })}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => append({ itemId: "", quantity: 1, unitPrice: 0 })}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
              {isSubmitting ? "Processing..." : "Complete Sale"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
