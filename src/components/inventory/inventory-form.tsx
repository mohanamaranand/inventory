
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
import { useInventory } from "@/context/inventory-context-firebase";
import { useToast } from "@/hooks/use-toast";
import {
  ITEM_CATEGORIES,
  ITEM_STATUSES,
  SOLD_STATUSES,
  type InventoryItem,
} from "@/lib/types";
import { useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, AlertTriangle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Timestamp } from "firebase/firestore";
import { useUser } from "@/firebase/auth/use-user";


const formSchema = z.object({
  purchaseInvoiceNumber: z.string().min(1, "Purchase invoice number is required."),
  vendorName: z.string().min(1, "Vendor name is required."),
  purchaseDate: z.date({ required_error: "A date of purchase is required." }),
  itemStdCode: z.string().min(1, "Item STD Code is required."),
  itemCategory: z.enum(ITEM_CATEGORIES, {
    required_error: "You need to select an item category.",
  }),
  productName: z.string().min(1, "Product name is required."),
  productDetails: z.string().optional(),
  quantity: z.coerce.number().int().min(0, "Quantity cannot be negative."),
  storageLocation: z.string().min(1, "Storage location is required."),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative."),
  purchasePrice: z.coerce.number().min(0, "Purchase price cannot be negative.").optional(),
  itemStatus: z.enum(ITEM_STATUSES).optional(),
  salesInvoiceNumber: z.string().optional(),
  salesDate: z.date().optional(),
  splitQuantity: z.coerce.number().int().min(0).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
});

type InventoryFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFormSubmit: () => void;
  itemId?: string | null;
};

export function InventoryForm({ open, onOpenChange, onFormSubmit, itemId }: InventoryFormProps) {
  const { addItem, editAndMergeItem, getItem, splitItem } = useInventory();
  const { toast } = useToast();
  const { user } = useUser();
  const isPrivilegedUser = user?.role === 'owner' || user?.role === 'administrator';
  
  const editingItem = itemId ? getItem(itemId) : null;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        purchaseInvoiceNumber: "",
        vendorName: "",
        purchaseDate: undefined,
        itemStdCode: "",
        productName: "",
        productDetails: "",
        quantity: 0,
        storageLocation: "",
        unitPrice: 0,
        purchasePrice: 0,
        salesInvoiceNumber: "",
        salesDate: undefined,
        splitQuantity: 0,
        imageUrl: "",
      },
  });

  const watchStatus = form.watch("itemStatus");
  const showSplit = editingItem && watchStatus && watchStatus !== editingItem.itemStatus;
  const isSoldStatus = watchStatus && SOLD_STATUSES.includes(watchStatus as any);

  useEffect(() => {
    if (editingItem) {
      let purchaseDate: Date;
      if (editingItem.purchaseDate) {
          if (editingItem.purchaseDate instanceof Timestamp) {
              purchaseDate = editingItem.purchaseDate.toDate();
          } else if (editingItem.purchaseDate instanceof Date) {
              purchaseDate = editingItem.purchaseDate;
          } else {
              const d = new Date(editingItem.purchaseDate);
              purchaseDate = !isNaN(d.getTime()) ? d : new Date();
          }
      } else {
          purchaseDate = new Date();
      }

      let salesDate: Date | undefined;
      if (editingItem.salesDate) {
          if (editingItem.salesDate instanceof Timestamp) {
              salesDate = editingItem.salesDate.toDate();
          } else if (editingItem.salesDate instanceof Date) {
              salesDate = editingItem.salesDate;
          } else {
              const d = new Date(editingItem.salesDate);
              if (!isNaN(d.getTime())) {
                  salesDate = d;
              }
          }
      }

      form.reset({
        ...editingItem,
        purchaseDate,
        salesDate,
        productDetails: editingItem.productDetails || "",
        salesInvoiceNumber: editingItem.salesInvoiceNumber || "",
        purchasePrice: editingItem.purchasePrice || 0,
        splitQuantity: 0,
      });
    } else {
      form.reset({
        purchaseInvoiceNumber: "",
        vendorName: "",
        purchaseDate: new Date(),
        itemStdCode: "",
        productName: "",
        productDetails: "",
        quantity: 0,
        storageLocation: "",
        unitPrice: 0,
        purchasePrice: 0,
        salesInvoiceNumber: "",
        itemStatus: 'In Stock',
        salesDate: undefined,
        splitQuantity: 0,
        imageUrl: "",
      });
    }
  }, [editingItem, form, open]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
        const submissionValues: Omit<InventoryItem, 'id'> = {
            ...values,
            imageUrl: values.imageUrl || '',
            productDetails: values.productDetails || '',
            salesInvoiceNumber: values.salesInvoiceNumber || '',
            purchasePrice: values.purchasePrice || 0,
            itemStatus: values.itemStatus || 'In Stock',
            purchaseDate: values.purchaseDate,
            salesDate: values.salesDate,
        };

        if (showSplit && values.splitQuantity && values.splitQuantity > 0) {
            if (!editingItem || values.splitQuantity > editingItem.quantity) {
              form.setError("splitQuantity", { message: "Split quantity cannot be greater than current quantity."});
              return;
            }
            await splitItem(
                editingItem.id,
                submissionValues.itemStatus!,
                values.splitQuantity,
                {
                    productDetails: submissionValues.productDetails,
                    salesInvoiceNumber: submissionValues.salesInvoiceNumber,
                    salesDate: submissionValues.salesDate
                }
            );
            toast({ title: "Item Split", description: `${values.splitQuantity} units of "${submissionValues.productName}" moved to status "${submissionValues.itemStatus}".` });
        } else if (editingItem && itemId) {
            const { splitQuantity, ...updateData } = submissionValues;
            await editAndMergeItem(itemId, updateData as Omit<InventoryItem, 'id'>);
            toast({ title: "Item Updated", description: `"${submissionValues.productName}" has been updated and combined with any matching items.` });
        } else {
            const { splitQuantity, ...addData } = submissionValues;
            await addItem({
                ...addData,
                purchaseDate: Timestamp.fromDate(submissionValues.purchaseDate),
                salesDate: submissionValues.salesDate ? Timestamp.fromDate(submissionValues.salesDate) : undefined,
            } as Omit<InventoryItem, 'id'>);
            toast({ title: "Item Added", description: `"${submissionValues.productName}" has been added to inventory.` });
        }
        onFormSubmit();
    } catch (error: any) {
        console.error("Form submission error:", error);
        toast({
            variant: "destructive",
            title: "Operation Failed",
            description: error.message || "An error occurred while saving the item."
        })
    }
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
                    <FormLabel>Unit Price (Sale)</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            {isPrivilegedUser && (
                 <FormField
                    control={form.control}
                    name="purchasePrice"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Purchase Price</FormLabel>
                        <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
            )}
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
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/image.png" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
              name="purchaseDate"
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
                          <Select onValueChange={field.onChange} value={field.value}>
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
                            You have changed the status. Enter a quantity below to split that amount into a new inventory item with the new status. The original item's quantity will be reduced. You can also edit details like 'Product Details' or 'Sales Invoice No.' for the new split item.
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
                    {isSoldStatus && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                name="salesDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                    <FormLabel>Sales Date</FormLabel>
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
                                                <span>Pick a sales date</span>
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
                        </div>
                    )}
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

    