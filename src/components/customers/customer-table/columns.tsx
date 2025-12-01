
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
import { Checkbox } from "@/components/ui/checkbox";
import type { Customer } from "@/lib/types";
import { useInventory } from "@/context/inventory-context";
import { useToast } from "@/hooks/use-toast";

type ColumnsProps = {
  onEdit: (id: string) => void;
};

export const columns = ({ onEdit }: ColumnsProps): ColumnDef<Customer>[] => [
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
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Company Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return <div className="font-medium">{row.original.name}</div>;
    },
  },
  {
    accessorKey: "contactPerson",
    header: "Contact Person",
  },
  {
    accessorKey: "phone",
    header: "Phone",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "address",
    header: "Address",
    cell: ({ row }) => <div className="truncate max-w-xs">{row.original.address}</div>,
  },
  {
    id: "actions",
    cell: function Cell({ row }) {
      const { deleteCustomer } = useInventory();
      const { toast } = useToast();
      const customer = row.original;

      const handleDelete = () => {
        deleteCustomer(customer.id);
        toast({
          variant: "destructive",
          title: "Customer Deleted",
          description: `"${customer.name}" has been removed.`,
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
            <DropdownMenuItem onClick={() => onEdit(customer.id)}>
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
