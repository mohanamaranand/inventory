
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
import type { ItemCategory } from "@/lib/types";
import { Badge } from "../ui/badge";
import Link from "next/link";
import { List } from "lucide-react";

export function CategoryWidget() {
  const { inventory } = useInventory();

  const categoryCounts = useMemo(() => {
    const counts = inventory.reduce((acc, item) => {
      const category = item.itemCategory;
      acc[category] = (acc[category] || 0) + item.quantity;
      return acc;
    }, {} as Record<ItemCategory, number>);

    return Object.entries(counts).map(([category, count]) => ({
      category: category as ItemCategory,
      count,
    }));
  }, [inventory]);

  return (
    <Card className="shadow-md h-full">
      <CardHeader>
        <CardTitle>Inventory by Category</CardTitle>
        <CardDescription>
          A breakdown of items by their assigned category.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {categoryCounts.length > 0 ? (
          <ScrollArea>
            <div className="space-y-4">
              {categoryCounts.map(({ category, count }) => (
                <Link
                  key={category}
                  href={`/inventory?category=${encodeURIComponent(category)}`}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
                >
                  <p className="font-medium text-sm">{category}</p>
                  <Badge variant="secondary">{count}</Badge>
                </Link>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center h-full">
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
