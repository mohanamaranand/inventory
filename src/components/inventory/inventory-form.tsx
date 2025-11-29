"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Textarea } from "@/components/ui/textarea";
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
import {
  ITEM_CATEGORIES,
  ITEM_STATUSES,
  type InventoryItem,
} from "@/lib/types";
import { useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, AlertTriangle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

const formSchema = z.object({
  purchaseInvoiceNumber: z.string().min(1, "Purchase invoice number is required."),
  vendorName: z.string().min(1, "Vendor name is required."),
  date: z.date({ required_error: "A date of purchase is required." }),
  itemStdCode: z.string().min(1, "Item STD Code is required."),
  itemCategory: z.enum(ITEM_CATEGORIES, {
    required_error: "You need to select an item category.",
  }),
  productName: z.string().min(1, "Product name is required."),
  productDetails: z.string().min(1, "Product details are required."),
  quantity: z.coerce.number().int().min(0, "Quantity cannot be negative."),
  storageLocation: z.string().min(1, "Storage location is required."),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative."),
  itemStatus: z.enum(ITEM_STATUSES).optional(),
  salesInvoiceNumber: z.string().optional(),
  splitQuantity: z.coerce.number().int().min(0).optional(),
});

type InventoryFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFormSubmit: () => void;
  itemId?: string | null;
};

export function InventoryForm({ open, onOpenChange, onFormSubmit, itemId }: InventoryFormProps) {
  const { addItem, updateItem, getItem, splitItem } = useInventory();
  const { toast } = useToast();
  
  const editingItem = itemId ? getItem(itemId) : null;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        purchaseInvoiceNumber: "",
        vendorName: "",
        date: undefined,
        itemStdCode: "",
        productName: "",
        productDetails: "",
        quantity: 0,
        storageLocation: "",
        unitPrice: 0,
        salesInvoiceNumber: "",
        splitQuantity: 0,
      },
  });

  const watchStatus = form.watch("itemStatus");
  const showSplit = editingItem && watchStatus && watchStatus !== editingItem.itemStatus;

  useEffect(() => {
    if (editingItem) {
      form.reset({
        ...editingItem,
        splitQuantity: 0,
      });
    } else {
      form.reset({
        purchaseInvoiceNumber: "",
        vendorName: "",
        date: new Date(),
        itemStdCode: "",
        productName: "",
        productDetails: "",
        quantity: 0,
        storageLocation: "",
        unitPrice: 0,
        salesInvoiceNumber: "",
        itemStatus: 'In Stock',
        splitQuantity: 0,
      });
    }
  }, [editingItem, form, open]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (showSplit && values.splitQuantity && values.splitQuantity > 0) {
      if (values.splitQuantity > editingItem.quantity) {
        form.setError("splitQuantity", { message: "Split quantity cannot be greater than current quantity."});
        return;
      }
      splitItem(editingItem.id, values.itemStatus!, values.splitQuantity);
      toast({ title: "Item Split", description: `${values.splitQuantity} units of "${values.productName}" moved to status "${values.itemStatus}".` });
    } else if (editingItem && itemId) {
      updateItem(itemId, values);
      toast({ title: "Item Updated", description: `"${values.productName}" has been updated.` });
    } else {
      addItem(values);
      toast({ title: "Item Added", description: `"${values.productName}" has been added to inventory.` });
    }
    onFormSubmit();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{editingItem ? "Edit Item" : "Add New Item"}</SheetTitle>
          <SheetDescription>
            {editingItem
              ? "Update the details of the existing inventory item."
              : "Fill in the details to add a new item to your inventory."}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-6">
            <FormField
              control={form.control}
              name="productName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Brake Pad Set" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="0" {...field} disabled={showSplit} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Unit Price</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
             <FormField
                control={form.control}
                name="productDetails"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Product Details</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Describe the product..." {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="itemCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ITEM_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
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
                name="itemStdCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item STD Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., AP-1023" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="storageLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Storage Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Aisle 3, Shelf 2" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="purchaseInvoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Invoice No.</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., INV-2023-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vendorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Global Auto Parts" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Purchase Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
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
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(editingItem || !itemId) && (
                 <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="itemStatus"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Item Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder="Select a status" />
                              </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                              {ITEM_STATUSES.map((status) => (
                                  <SelectItem key={status} value={status}>
                                  {status}
                                  </SelectItem>
                              ))}
                              </SelectContent>
                          </Select>
                          <FormMessage />
                          </FormItem>
                      )}
                    />
                    {showSplit && (
                      <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                        <Alert variant="default" className="border-primary/50">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Splitting Item</AlertTitle>
                          <AlertDescription>
                            You have changed the status. Enter a quantity below to split that amount into a new inventory item with the new status. The original item's quantity will be reduced.
                          </AlertDescription>
                        </Alert>
                        <FormField
                            control={form.control}
                            name="splitQuantity"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Quantity to move to new status</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="0" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                      </div>
                    )}
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
                </div>
            )}
            
            <SheetFooter>
                <SheetClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                </SheetClose>
                <Button type="submit">Save Changes</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
