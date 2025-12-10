
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ArrowUpDown, Copy } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { Customer } from "@/lib/types";
import { useInventory } from "@/context/inventory-context-firebase";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


type ColumnsProps = {
  onEdit: (id: string) => void;
  onViewPurchases: (customer: Customer) => void;
};

// A dedicated component for the cell to safely use hooks
function CustomerIdCell({ row }: { row: { original: Customer } }) {
  const id = row.original.id;
  const { toast } = useToast();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(id);
    toast({ title: "Customer ID Copied!" });
  };

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs">{id.substring(0, 8)}...</span>
      <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyToClipboard}>
                    <Copy className="h-3 w-3" />
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>Copy Customer ID</p>
            </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

// A dedicated component for the actions cell to safely use hooks
function ActionsCell({ row, onEdit, onViewPurchases }: { row: { original: Customer }, onEdit: (id: string) => void, onViewPurchases: (customer: Customer) => void }) {
  const { deleteCustomer } = useInventory();
  const { toast } = useToast();
  const customer = row.original;

  const handleDelete = () => {
    if (!customer?.id) return;
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
        <DropdownMenuItem onClick={() => customer && onViewPurchases(customer)}>
          View Purchases
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => customer && onEdit(customer.id)}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDelete}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


export const columns = ({ onEdit, onViewPurchases }: ColumnsProps): ColumnDef<Customer>[] => [
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
    header: "Customer ID",
    cell: ({row}) => <CustomerIdCell row={row} />,
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
    cell: ({ row }) => <ActionsCell row={row} onEdit={onEdit} onViewPurchases={onViewPurchases} />,
  },
];
