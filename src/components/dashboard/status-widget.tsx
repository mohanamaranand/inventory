
"use client";

import { useInventory } from "@/context/inventory-context";
import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ItemStatus } from "@/lib/types";
import { Badge } from "../ui/badge";
import Link from "next/link";
import { List, CheckCircle, Package, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const statusColors: Record<ItemStatus, string> = {
    'In Stock': 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
    'Out of Stock': 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
    'Assembled': 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    'Sold as Spare': 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
    'Sold as vehicle': 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
    'Damaged': 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 border-yellow-500/20',
    'Own use': 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20',
    'Missing': 'bg-orange-500/10 text-orange-700 dark:text-orange-500 border-orange-500/20',
    'Fault': 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 border-yellow-500/20',
    'Returned': 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
};


export function StatusWidget() {
  const { inventory } = useInventory();

  const statusCounts = useMemo(() => {
    const counts = inventory.reduce((acc, item) => {
      const status = item.itemStatus || "In Stock";
      acc[status] = (acc[status] || 0) + item.quantity;
      return acc;
    }, {} as Record<ItemStatus, number>);

    return Object.entries(counts)
        .map(([status, count]) => ({
            status: status as ItemStatus,
            count,
        }))
        .sort((a,b) => b.count - a.count);

  }, [inventory]);

  return (
    <Card className="shadow-md flex flex-col">
      <CardHeader>
        <CardTitle>Inventory by Status</CardTitle>
        <CardDescription>
          A summary of items based on their current status.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        {statusCounts.length > 0 ? (
          <ScrollArea className="h-full pr-4">
            <div className="space-y-2">
              {statusCounts.map(({ status, count }) => (
                <Link
                  key={status}
                  href={`/inventory?status=${encodeURIComponent(status)}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <p className="font-medium text-sm">{status}</p>
                  <Badge variant="secondary" className={cn("text-xs", statusColors[status])}>
                    {count.toLocaleString()}
                  </Badge>
                </Link>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed text-center h-full">
            <List className="mx-auto h-10 w-10 text-muted-foreground" />
             <p className="mt-4 text-sm font-medium">No Inventory Found</p>
            <p className="text-xs text-muted-foreground">
              Add items to see a status breakdown.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
