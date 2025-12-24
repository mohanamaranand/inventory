
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InventoryItem, ItemStatus } from "@/lib/types";
import { ITEM_STATUSES, SOLD_STATUSES } from "@/lib/types";
import { useInventory } from "@/context/inventory-context-firebase";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, CalendarIcon, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";


type ColumnsProps = {
  onEdit: (id: string) => void;
  isPrivilegedUser: boolean;
};

function StatusUpdateDialog({ 
    item, 
    targetStatus, 
    open, 
    onOpenChange, 
    onSubmit 
}: { 
    item: InventoryItem, 
    targetStatus: ItemStatus | null, 
    open: boolean, 
    onOpenChange: (open: boolean) => void,
    onSubmit: (qty: number, status: ItemStatus, data: any) => Promise<void>
}) {
    const [splitQuantity, setSplitQuantity] = useState<number | string>(item.quantity > 1 ? 1 : item.quantity);
    const [salesInvoiceNumber, setSalesInvoiceNumber] = useState("");
    const [salesDate, setSalesDate] = useState<Date | undefined>(new Date());
    const [faultDescription, setFaultDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const wasOpenRef = useRef(open);

    useEffect(() => {
        if (open && !wasOpenRef.current) {
            setSplitQuantity(item.quantity > 1 ? 1 : item.quantity);
            if (targetStatus && (targetStatus === 'Fault' || targetStatus === 'Damaged') && item.faultDescription) {
                setFaultDescription(item.faultDescription);
            } else {
                setFaultDescription("");
            }
            setSalesInvoiceNumber("");
            setSalesDate(new Date());
        }
        wasOpenRef.current = open;
    }, [open, item, targetStatus]); 
    
    if (!targetStatus) return null;

    const isSoldStatus = SOLD_STATUSES.includes(targetStatus as any);
    const isFaultStatus = targetStatus === 'Fault' || targetStatus === 'Damaged';

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const splitData: { salesInvoiceNumber?: string; salesDate?: Date; faultDescription?: string } = {};
            if (isSoldStatus) {
                splitData.salesInvoiceNumber = salesInvoiceNumber;
                splitData.salesDate = salesDate;
            }
            if (isFaultStatus) {
                splitData.faultDescription = faultDescription;
            }
            await onSubmit(Number(splitQuantity), targetStatus, splitData);
            onOpenChange(false);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Update Item Status</DialogTitle>
                    <DialogDescription>
                        {item.quantity > 1 
                            ? `Move a specific quantity of "${item.productName}" to the new status "${targetStatus}".`
                            : `Update status of "${item.productName}" to "${targetStatus}".`
                        }
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {item.quantity > 1 && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="split-quantity" className="text-right">
                                Quantity
                            </Label>
                            <Input
                                id="split-quantity"
                                type="number"
                                value={splitQuantity}
                                onChange={(e) => setSplitQuantity(e.target.value)}
                                className="col-span-3"
                                max={item.quantity}
                                min={1}
                            />
                        </div>
                    )}
                    
                    {isSoldStatus && (
                        <>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="sales-invoice" className="text-right">
                                    Sales Invoice
                                </Label>
                                <Input
                                    id="sales-invoice"
                                    value={salesInvoiceNumber}
                                    onChange={(e) => setSalesInvoiceNumber(e.target.value)}
                                    className="col-span-3"
                                    placeholder="Optional"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="sales-date" className="text-right">
                                    Sales Date
                                </Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "col-span-3 justify-start text-left font-normal",
                                                !salesDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {salesDate ? format(salesDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={salesDate}
                                            onSelect={setSalesDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </>
                    )}

                    {isFaultStatus && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="fault-desc" className="text-right">
                                Fault Description
                            </Label>
                            <Textarea
                                id="fault-desc"
                                value={faultDescription}
                                onChange={(e) => setFaultDescription(e.target.value)}
                                className="col-span-3"
                                placeholder="Describe the fault or damage..."
                            />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
                    <Button type="button" onClick={handleSubmit} disabled={isSubmitting || (item.quantity > 1 && (!splitQuantity || Number(splitQuantity) > item.quantity))}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function StatusCell({ row }: { row: { original: InventoryItem } }) {
  const { splitItem } = useInventory();
  const { toast } = useToast();
  const item = row.original;
  const [targetStatus, setTargetStatus] = useState<ItemStatus | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleStatusChange = (status: ItemStatus) => {
    setTargetStatus(status);
    const needsDialog = item.quantity > 1 || SOLD_STATUSES.includes(status as any) || status === 'Fault' || status === 'Damaged';
    
    if (needsDialog) {
        setIsDialogOpen(true);
    } else {
        if (status !== item.itemStatus) {
            handleSubmit(item.quantity, status, {});
        }
    }
  };

  const handleSubmit = async (qty: number, status: ItemStatus, data: any) => {
    const { id: toastId } = toast({
        title: "Updating Status...",
        description: `Moving ${qty} units of "${item.productName}" to ${status}.`
    });

    try {
        await splitItem(item.id, status, qty, data);
        toast({
            id: toastId,
            variant: 'default',
            title: "Item Status Updated",
            description: `${qty} units of "${item.productName}" moved to ${status}.`,
        });
    } catch (error: any) {
        toast({
            id: toastId,
            variant: 'destructive',
            title: 'Operation Failed',
            description: error.message || 'Could not update item status.',
        });
        throw error;
    }
  };

  return (
    <>
      <StatusUpdateDialog 
        item={item} 
        targetStatus={targetStatus} 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        onSubmit={handleSubmit}
      />
      <Select onValueChange={handleStatusChange} value={item.itemStatus}>
        <SelectTrigger className="w-[150px] text-xs h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ITEM_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}


export const defineColumns = ({ onEdit, isPrivilegedUser }: ColumnsProps): ColumnDef<InventoryItem>[] => {

    const allColumns: ColumnDef<InventoryItem>[] = [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "id",
        header: "S.No",
        cell: ({ row }) => {
            const id = row.original.id;
            return <span>{id.substring(0, 5)}...</span>;
        },
      },
      {
        accessorKey: "productName",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Product
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const item = row.original;
          const imageUrl = item.imageUrl || `https://picsum.photos/seed/${item.itemStdCode}/40/40`;
          
          return (
            <div className="flex items-center gap-3">
                <Image
                    src={imageUrl}
                    alt={item.productName}
                    width={40}
                    height={40}
                    className="rounded-md object-cover"
                    data-ai-hint="product image"
                />
              <div className="flex flex-col">
                <span className="font-medium">{item.productName}</span>
                <span className="text-xs text-muted-foreground">{item.itemStdCode}</span>
                {item.faultDescription && (
                    <Badge variant="destructive" className="mt-1 w-fit text-[10px] px-1 py-0">{item.faultDescription}</Badge>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "faultDescription",
        header: "Fault Details",
        cell: ({ row }) => {
            const desc = row.original.faultDescription;
            if (!desc) return <span className="text-muted-foreground">-</span>;
            return <span className="text-red-600 font-medium max-w-[150px] truncate" title={desc}>{desc}</span>;
        }
      },
      {
        accessorKey: "itemCategory",
        header: "Category",
        cell: ({ row }) => {
          return <Badge variant="secondary">{row.original.itemCategory}</Badge>;
        },
        filterFn: (row, id, value) => {
          if (!value || value.length === 0) return true;
          return value.includes(row.getValue(id));
        },
      },
      {
        accessorKey: "itemStatus",
        header: "Status",
        cell: ({ row }) => <StatusCell row={row} />,
        filterFn: (row, id, value) => {
          if (!value || value.length === 0) return true;
          return value.includes(row.getValue(id));
        },
      },
       {
        accessorKey: "itemStdCode",
        header: "Item Code",
        enableHiding: true,
      },
      {
        accessorKey: "purchaseInvoiceNumber",
        header: "Purchase Invoice",
        enableHiding: true,
      },
       {
        accessorKey: "salesInvoiceNumber",
        header: "Sales Invoice",
        enableHiding: true,
      },
       {
        accessorKey: "vendorName",
        header: "Vendor",
        enableHiding: true,
      },
      {
        accessorKey: "salesDate",
        header: "Date Sold",
        cell: ({ row }) => {
          const item = row.original;
          if (!SOLD_STATUSES.includes(item.itemStatus as any) || !item.salesDate) {
            return <span className="text-muted-foreground">-</span>;
          }
          const date = item.salesDate;
          const jsDate = date instanceof Timestamp ? date.toDate() : new Date(date);
          return <span>{jsDate ? format(jsDate, "PPP") : 'N/A'}</span>;
        }
      },
      {
        accessorKey: "quantity",
        header: "Quantity",
      },
      {
        id: "totalValue",
        header: "Total Value",
        cell: ({ row }) => {
          const { quantity, unitPrice } = row.original;
          return formatCurrency(quantity * unitPrice);
        },
      },
    ];

    if (isPrivilegedUser) {
        allColumns.push({
          accessorKey: "purchasePrice",
          header: "Purchase Value",
          cell: ({ row }) => {
            const { quantity, purchasePrice } = row.original;
            return formatCurrency(quantity * (purchasePrice || 0));
          },
        });
    }

    allColumns.push({
        id: "actions",
        cell: function Cell({ row }) {
          const { deleteItem } = useInventory();
          const { toast } = useToast();
          const item = row.original;

          const handleDelete = (restock: boolean) => {
            deleteItem(item.id, restock);
            toast({
              variant: "destructive",
              title: "Item Deleted",
              description: `"${item.productName}" has been removed from inventory.`,
            });
          };
          
          if (SOLD_STATUSES.includes(item.itemStatus as any) || item.itemCategory === 'Assembled Vehicle' || item.itemCategory === 'Assembled Battery') {
            return (
              <AlertDialog>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onEdit(item.id)}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <AlertDialogTrigger asChild>
                        <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                        Delete
                        </DropdownMenuItem>
                    </AlertDialogTrigger>
                  </DropdownMenuContent>
                </DropdownMenu>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Sold/Assembled Item?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Do you want to restock the parts from this item back into inventory (useful for returns/disassembly), or just delete the record?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(false)}>Delete Only</AlertDialogAction>
                    <AlertDialogAction onClick={() => handleDelete(true)}>Delete & Restock Parts</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            );
          }

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onEdit(item.id)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete(false)}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    )

    return allColumns;
};

    