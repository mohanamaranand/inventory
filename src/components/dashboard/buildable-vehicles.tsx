
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
import { Badge } from "@/components/ui/badge";

export function BuildableVehicles() {
  const { vehicleModels, getItemByStdCode, assembledVehicles } = useInventory();

  const vehicleStats = useMemo(() => {
    const assembledCounts = assembledVehicles.reduce((acc, vehicle) => {
      acc[vehicle.modelId] = (acc[vehicle.modelId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return vehicleModels.map((model) => {
      let buildableCount: number;
      if (model.parts.length === 0) {
        buildableCount = Infinity; // Can't build if no parts are defined, but can't divide by zero
      } else {
        const possibleCounts = model.parts.map((part) => {
          const inventoryItem = getItemByStdCode(part.itemStdCode);
          const availableQuantity = inventoryItem ? inventoryItem.quantity : 0;
          if (part.quantity === 0) return Infinity; // Avoid division by zero
          return Math.floor(availableQuantity / part.quantity);
        });
        buildableCount = Math.min(...possibleCounts);
      }

      return {
        modelId: model.id,
        modelName: model.name,
        buildableCount,
        assembledCount: assembledCounts[model.id] || 0,
      };
    });
  }, [vehicleModels, assembledVehicles, getItemByStdCode]);

  return (
    <Card className="shadow-md h-full">
      <CardHeader>
        <CardTitle>Vehicle Build Status</CardTitle>
        <CardDescription>
          Your current production capacity based on available inventory.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {vehicleModels.length > 0 ? (
          <ScrollArea className="h-[250px]">
            <div className="space-y-4">
              {vehicleStats.map((stats) => (
                <div key={stats.modelId} className="flex items-center justify-between">
                  <p className="font-medium">{stats.modelName}</p>
                  <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2 text-sm text-muted-foreground" title="Assembled">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="font-bold text-foreground text-base">{stats.assembledCount}</span>
                     </div>
                     <div className="flex items-center gap-2 text-sm text-muted-foreground" title="Buildable">
                        <Wrench className="h-5 w-5 text-blue-500" />
                        <span className="font-bold text-foreground text-base">{stats.buildableCount}</span>
                     </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center h-[250px]">
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
