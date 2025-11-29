
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
import { List } from "lucide-react";

export function StatusWidget() {
  const { inventory } = useInventory();

  const statusCounts = useMemo(() => {
    const counts = inventory.reduce((acc, item) => {
      const status = item.itemStatus || "In Stock";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<ItemStatus, number>);

    return Object.entries(counts).map(([status, count]) => ({
      status: status as ItemStatus,
      count,
    }));
  }, [inventory]);

  return (
    <Card className="shadow-md h-full">
      <CardHeader>
        <CardTitle>Inventory by Status</CardTitle>
        <CardDescription>
          A breakdown of items by their current status.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {statusCounts.length > 0 ? (
          <ScrollArea className="h-48">
            <div className="space-y-4">
              {statusCounts.map(({ status, count }) => (
                <Link
                  key={status}
                  href={`/inventory?status=${encodeURIComponent(status)}`}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
                >
                  <p className="font-medium text-sm">{status}</p>
                  <Badge variant="secondary">{count}</Badge>
                </Link>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center h-48">
            <List className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              No inventory items to display.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
