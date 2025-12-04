
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
import { ITEM_STATUSES } from "@/lib/types";
import { useInventory } from "@/context/inventory-context-firebase";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
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
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/firebase/auth/use-user";

type ColumnsProps = {
  onEdit: (id: string) => void;
};

export const columns = ({ onEdit }: ColumnsProps): ColumnDef<InventoryItem>[] => {
    const { user } = useUser();
    const isPrivilegedUser = user?.role === 'owner' || user?.role === 'administrator';

    return [
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
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "itemCategory",
        header: "Category",
        cell: ({ row }) => {
          return <Badge variant="secondary">{row.original.itemCategory}</Badge>;
        },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
      },
      {
        accessorKey: "itemStatus",
        header: "Status",
        cell: function Cell({ row }) {
          const { splitItem } = useInventory();
          const { toast } = useToast();
          const item = row.original;
          const [isSplitDialogOpen, setIsSplitDialogOpen] = useState(false);
          const [newStatus, setNewStatus] = useState<ItemStatus | null>(null);
          const [splitQuantity, setSplitQuantity] = useState<number | string>("");

          const handleStatusChange = (status: ItemStatus) => {
            if (status !== item.itemStatus) {
                setNewStatus(status);
                if (item.quantity > 1) {
                  setSplitQuantity(1); // Default to 1
                  setIsSplitDialogOpen(true);
                } else {
                  splitItem(item.id, status, 1);
                   toast({
                      title: "Item Status Updated",
                      description: `"${item.productName}" has been moved to ${status}.`,
                  });
                }
            }
          };

          const handleSplitSubmit = () => {
            const qty = Number(splitQuantity);
            if (newStatus && qty > 0 && qty <= item.quantity) {
              splitItem(item.id, newStatus, qty);
              toast({
                title: "Item Split",
                description: `${qty} units of "${item.productName}" moved to status "${newStatus}".`
              });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Invalid Quantity',
                    description: `Quantity must be between 1 and ${item.quantity}.`
                })
            }
            setIsSplitDialogOpen(false);
            setNewStatus(null);
            setSplitQuantity("");
          }
          
          if (item.itemCategory === 'Assembled Vehicle') {
            return <Badge variant="default">{item.itemStatus}</Badge>;
          }

          return (
            <>
                <Dialog open={isSplitDialogOpen} onOpenChange={setIsSplitDialogOpen}>
                    <Select onValueChange={handleStatusChange} value={item.itemStatus}>
                        <SelectTrigger className="w-[150px] text-xs h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {ITEM_STATUSES.map((status) => (
                            <SelectItem key={status} value={status} disabled={status === item.itemStatus}>
                                {status}
                            </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <DialogContent>
                        <DialogHeader>
                        <DialogTitle>Split Item Quantity</DialogTitle>
                        <DialogDescription>
                            Move a specific quantity of "{item.productName}" to the new status "{newStatus}". The current quantity is {item.quantity}.
                        </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
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
                        </div>
                        <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="button" onClick={handleSplitSubmit}>Confirm Split</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
          );
        },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
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
      ...(isPrivilegedUser ? [{
        accessorKey: "purchasePrice",
        header: "Purchase Price",
        cell: ({ row }: { row: any }) => {
          const { quantity, purchasePrice } = row.original;
          return formatCurrency(quantity * (purchasePrice || 0));
        },
      }] : []),
      {
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
          
          if (item.itemCategory === "Assembled Vehicle" || item.itemCategory === "Assembled Battery") {
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
                    <AlertDialogTitle>Delete Assembled Item?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Do you want to restock the parts from this item back into inventory, or just delete the record?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(false)}>Delete Only</AlertDialogAction>
                    <AlertDialogAction onClick={() => handleDelete(true)}>Delete & Restock</AlertDialogAction>
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
    ]
};

    