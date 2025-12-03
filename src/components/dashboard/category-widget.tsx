
"use client";

import { useInventory } from "@/context/inventory-context-firebase";
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
import { List, Boxes, Archive } from "lucide-react";
import { Separator } from "../ui/separator";

export function CategoryWidget() {
  const { inventory } = useInventory();

  const categoryStats = useMemo(() => {
    const stats: Record<
      string,
      { unitCount: number; uniqueItems: Set<string> }
    > = {};

    inventory.forEach((item) => {
      const category = item.itemCategory;
      if (!stats[category]) {
        stats[category] = { unitCount: 0, uniqueItems: new Set() };
      }
      stats[category].unitCount += item.quantity;
      stats[category].uniqueItems.add(item.itemStdCode);
    });

    return Object.entries(stats)
      .map(([category, data]) => ({
        category: category as ItemCategory,
        unitCount: data.unitCount,
        itemCount: data.uniqueItems.size,
      }))
      .sort((a, b) => b.unitCount - a.unitCount);
  }, [inventory]);

  return (
    <Card className="shadow-md flex flex-col">
      <CardHeader>
        <CardTitle>Inventory by Category</CardTitle>
        <CardDescription>
          A breakdown of items by their assigned category.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        {categoryStats.length > 0 ? (
          <ScrollArea className="h-full pr-4">
            <div className="space-y-4">
              {categoryStats.map(({ category, unitCount, itemCount }, index) => (
                <div key={category}>
                  <Link
                    href={`/inventory?category=${encodeURIComponent(category)}`}
                    className="block p-2 rounded-md hover:bg-muted"
                  >
                    <p className="font-medium text-sm mb-2">{category}</p>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-2" title="Total number of unique items">
                            <Boxes className="h-4 w-4 text-blue-500" />
                            <span>{itemCount} Item Types</span>
                        </div>
                        <div className="flex items-center gap-2" title="Total quantity of all units">
                            <Archive className="h-4 w-4 text-green-500" />
                            <span>{unitCount} Total Units</span>
                        </div>
                    </div>
                  </Link>
                  {index < categoryStats.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed h-full">
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
