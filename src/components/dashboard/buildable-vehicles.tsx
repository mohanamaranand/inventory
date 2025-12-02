
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
import { Wrench, CheckCircle } from "lucide-react";
import { Separator } from "../ui/separator";

export function BuildableVehicles() {
  const { vehicleModels, batteryModels, getItemByStdCode } = useInventory();

  const buildableStats = useMemo(() => {
    const calculateBuildableCount = (parts: { itemStdCode: string; quantity: number }[]) => {
      if (parts.length === 0) return 0;
      const possibleCounts = parts.map((part) => {
        const inventoryItem = getItemByStdCode(part.itemStdCode);
        const availableQuantity = inventoryItem ? inventoryItem.quantity : 0;
        if (part.quantity === 0) return Infinity;
        return Math.floor(availableQuantity / part.quantity);
      });
      return Math.min(...possibleCounts);
    };

    const vehicleStats = vehicleModels.map((model) => ({
      type: "Vehicle",
      modelName: model.name,
      buildableCount: calculateBuildableCount(model.parts),
    }));

    const batteryStats = batteryModels.map((model) => ({
      type: "Battery",
      modelName: model.name,
      buildableCount: calculateBuildableCount(model.parts),
    }));

    return [...vehicleStats, ...batteryStats].sort((a, b) => a.modelName.localeCompare(b.modelName));
  }, [vehicleModels, batteryModels, getItemByStdCode]);

  return (
    <Card className="shadow-md h-full">
      <CardHeader>
        <CardTitle>Production Capacity</CardTitle>
        <CardDescription>
          How many of each model you can build with current parts inventory.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {buildableStats.length > 0 ? (
          <ScrollArea className="h-[200px] pr-4">
            <div className="space-y-4">
              {buildableStats.map((stats, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{stats.modelName}</p>
                      <p className="text-xs text-muted-foreground">{stats.type}</p>
                    </div>
                    <div className="flex items-center gap-2" title="Buildable">
                      <Wrench className="h-4 w-4 text-blue-500" />
                      <span className="font-bold text-lg">{stats.buildableCount}</span>
                    </div>
                  </div>
                  {index < buildableStats.length -1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed text-center min-h-[200px]">
            <Wrench className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-sm font-medium">No Models Found</p>
            <p className="text-xs text-muted-foreground">
              Create a vehicle or battery model to see production capacity.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
