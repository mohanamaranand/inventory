
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
import { Wrench, Battery, CheckCircle } from "lucide-react";
import { Separator } from "../ui/separator";

export function AssembledSummary() {
  const { assembledVehicles, getVehicleModel, assembledBatteries, getBatteryModel } = useInventory();

  const assemblyStats = useMemo(() => {
    const vehicleCounts = assembledVehicles.reduce((acc, vehicle) => {
      const modelName = getVehicleModel(vehicle.modelId)?.name || 'Unknown Vehicle';
      acc[modelName] = (acc[modelName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const batteryCounts = assembledBatteries.reduce((acc, battery) => {
        const modelName = getBatteryModel(battery.modelId)?.name || 'Unknown Battery';
        acc[modelName] = (acc[modelName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const vehicleStats = Object.entries(vehicleCounts).map(([modelName, count]) => ({
      type: "Vehicle",
      modelName,
      count,
      icon: Wrench
    }));

    const batteryStats = Object.entries(batteryCounts).map(([modelName, count]) => ({
        type: "Battery",
        modelName,
        count,
        icon: Battery
    }));

    return [...vehicleStats, ...batteryStats].sort((a, b) => b.count - a.count);
  }, [assembledVehicles, getVehicleModel, assembledBatteries, getBatteryModel]);

  return (
    <Card className="shadow-md h-full">
      <CardHeader>
        <CardTitle>Assembled Products</CardTitle>
        <CardDescription>
          Total units built for each model.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {assemblyStats.length > 0 ? (
          <ScrollArea className="pr-4">
            <div className="space-y-4">
              {assemblyStats.map((stats, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                        <stats.icon className="h-5 w-5 text-primary" />
                        <div>
                            <p className="font-medium">{stats.modelName}</p>
                            <p className="text-xs text-muted-foreground">{stats.type}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2" title="Assembled">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="font-bold text-base">{stats.count}</span>
                    </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed text-center h-full p-4">
            <CheckCircle className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-sm font-medium">No Assembled Products</p>
            <p className="text-xs text-muted-foreground">
              Assemble a vehicle or battery to see a summary here.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
