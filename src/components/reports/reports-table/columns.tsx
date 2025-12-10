
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import type { InventoryItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { Timestamp } from "firebase/firestore";


export const columns: ColumnDef<InventoryItem>[] = [
  {
    accessorKey: "purchaseDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
        const date = row.getValue("purchaseDate") as Date | Timestamp;
        if (!date) return null;
        const jsDate = date instanceof Timestamp ? date.toDate() : date;
        return <span>{format(jsDate, "PPP")}</span>;
    }
  },
  {
    accessorKey: "productName",
    header: "Product",
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
    accessorKey: "itemStatus",
    header: "Status",
    cell: ({ row }) => {
        return <Badge variant="destructive">{row.original.itemStatus}</Badge>;
    },
    filterFn: (row, id, value) => {
      if (!value || value.length === 0) return true;
      return value.includes(row.getValue(id));
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
    accessorKey: "quantity",
    header: "Quantity",
  },
  {
    accessorKey: "unitPrice",
    header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Unit Price
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
    cell: ({ row }) => {
      return formatCurrency(row.original.unitPrice);
    },
  },
  {
    id: "totalValue",
    header: "Total Value",
    cell: ({ row }) => {
      const { quantity, unitPrice } = row.original;
      return formatCurrency(quantity * unitPrice);
    },
    sortingFn: (rowA, rowB) => {
        const totalA = rowA.original.quantity * rowA.original.unitPrice;
        const totalB = rowB.original.quantity * rowB.original.unitPrice;
        return totalA - totalB;
    }
  },
];
