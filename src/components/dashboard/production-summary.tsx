
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
import { Wrench, CheckCircle, Battery, Car } from "lucide-react";
import { Separator } from "../ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

export function ProductionSummary() {
  const { 
    vehicleModels, 
    batteryModels, 
    getItemByStdCode,
    assembledVehicles,
    assembledBatteries,
    getVehicleModel,
    getBatteryModel
  } = useInventory();

  const productionStats = useMemo(() => {
    const calculateBuildableCount = (parts: { itemStdCode: string; quantity: number }[] | undefined) => {
      if (!parts || parts.length === 0) return 0;
      const possibleCounts = parts.map((part) => {
        const inventoryItem = getItemByStdCode(part.itemStdCode);
        const availableQuantity = inventoryItem ? inventoryItem.quantity : 0;
        if (part.quantity === 0) return Infinity;
        return Math.floor(availableQuantity / part.quantity);
      });
      return Math.min(...possibleCounts);
    };

    const assembledVehicleCounts = assembledVehicles.reduce((acc, vehicle) => {
      const modelName = getVehicleModel(vehicle.modelId)?.name || 'Unknown Vehicle';
      acc[modelName] = (acc[modelName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const assembledBatteryCounts = assembledBatteries.reduce((acc, battery) => {
        const modelName = getBatteryModel(battery.modelId)?.name || 'Unknown Battery';
        acc[modelName] = (acc[modelName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const vehicleStats = vehicleModels.map((model) => ({
      type: "Vehicle" as const,
      modelName: model.name,
      buildableCount: calculateBuildableCount(model.parts),
      assembledCount: assembledVehicleCounts[model.name] || 0,
      Icon: Car,
    }));

    const batteryStats = batteryModels.map((model) => ({
      type: "Battery" as const,
      modelName: model.name,
      buildableCount: calculateBuildableCount(model.parts),
      assembledCount: assembledBatteryCounts[model.name] || 0,
      Icon: Battery,
    }));

    return [...vehicleStats, ...batteryStats].sort((a, b) => a.modelName.localeCompare(b.modelName));
  }, [vehicleModels, batteryModels, assembledVehicles, assembledBatteries, getItemByStdCode, getVehicleModel, getBatteryModel]);

  return (
    <Card className="shadow-md flex flex-col">
      <CardHeader>
        <CardTitle>Production Summary</CardTitle>
        <CardDescription>
          Buildable vs. Assembled counts for each model based on current inventory.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        {productionStats.length > 0 ? (
          <ScrollArea className="h-full pr-4">
            <div className="space-y-4">
              <TooltipProvider>
                {productionStats.map((stats, index) => (
                  <div key={index}>
                    <div className="grid grid-cols-[1fr_auto] items-center gap-4 text-sm">
                      <div className="flex items-center gap-3">
                          <stats.Icon className="h-5 w-5 text-muted-foreground" />
                          <div>
                              <p className="font-medium">{stats.modelName}</p>
                              <p className="text-xs text-muted-foreground">{stats.type}</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-6">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2">
                                  <Wrench className="h-4 w-4 text-blue-500" />
                                  <span className="font-bold text-lg">{stats.buildableCount}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Number of units you can build with current inventory.</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <span className="font-bold text-lg">{stats.assembledCount}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Number of units already assembled and in stock.</p>
                            </TooltipContent>
                          </Tooltip>
                      </div>
                    </div>
                    {index < productionStats.length -1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </TooltipProvider>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed text-center h-full p-4">
            <Wrench className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-sm font-medium">No Models Found</p>
            <p className="text-xs text-muted-foreground">
              Create a vehicle or battery model to see production stats.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
