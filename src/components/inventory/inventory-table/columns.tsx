"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
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
import { useInventory } from "@/context/inventory-context";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

type ColumnsProps = {
  onEdit: (id: string) => void;
};

export const columns = ({ onEdit }: ColumnsProps): ColumnDef<InventoryItem>[] => [
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
      return (
        <div className="flex flex-col">
          <span className="font-medium">{item.productName}</span>
          <span className="text-xs text-muted-foreground">{item.itemStdCode}</span>
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
      const { updateItem } = useInventory();
      const { toast } = useToast();
      const item = row.original;

      const handleStatusChange = (newStatus: ItemStatus) => {
        updateItem(item.id, { itemStatus: newStatus });
        toast({
          title: "Status Updated",
          description: `"${item.productName}" status changed to ${newStatus}.`,
        });
      };

      return (
        <Select onValueChange={handleStatusChange} defaultValue={item.itemStatus}>
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
  {
    id: "actions",
    cell: function Cell({ row }) {
      const { deleteItem } = useInventory();
      const { toast } = useToast();
      const item = row.original;

      const handleDelete = () => {
        deleteItem(item.id);
        toast({
          variant: "destructive",
          title: "Item Deleted",
          description: `"${item.productName}" has been removed from inventory.`,
        });
      };

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
              onClick={handleDelete}
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
