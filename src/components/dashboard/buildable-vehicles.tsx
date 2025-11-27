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
import { Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function BuildableVehicles() {
  const { vehicleModels, getItemByStdCode } = useInventory();

  const buildableCounts = useMemo(() => {
    return vehicleModels.map((model) => {
      if (model.parts.length === 0) {
        return { modelName: model.name, count: Infinity };
      }

      const possibleCounts = model.parts.map((part) => {
        const inventoryItem = getItemByStdCode(part.itemStdCode);
        const availableQuantity = inventoryItem ? inventoryItem.quantity : 0;
        return Math.floor(availableQuantity / part.quantity);
      });

      return { modelName: model.name, count: Math.min(...possibleCounts) };
    });
  }, [vehicleModels, getItemByStdCode]);

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Buildable Vehicles</CardTitle>
        <CardDescription>
          Estimated number of vehicles you can assemble with current inventory.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {vehicleModels.length > 0 ? (
          <ScrollArea className="h-48">
            <div className="space-y-4">
              {buildableCounts.map(({ modelName, count }) => (
                <div key={modelName} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-muted p-2 rounded-md">
                      <Wrench className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="font-medium">{modelName}</p>
                  </div>
                  <Badge variant="secondary" className="text-lg">
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
            <Wrench className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              No vehicle models created yet.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
