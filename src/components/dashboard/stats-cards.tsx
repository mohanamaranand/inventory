"use client";

import { useInventory } from "@/context/inventory-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Boxes, DollarSign, BatteryWarning, ArchiveX } from "lucide-react";
import { useMemo } from "react";

export function StatsCards() {
  const { inventory } = useInventory();

  const stats = useMemo(() => {
    const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = inventory.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const lowStockItems = inventory.filter(
      (item) => item.quantity > 0 && item.quantity <= 10
    ).length;
    const outOfStockItems = inventory.filter(
      (item) => item.quantity === 0
    ).length;

    return { totalItems, totalValue, lowStockItems, outOfStockItems };
  }, [inventory]);

  const statItems = [
    {
      title: "Total Units",
      value: stats.totalItems.toLocaleString(),
      icon: Boxes,
      color: "text-blue-500",
    },
    {
      title: "Total Value",
      value: formatCurrency(stats.totalValue),
      icon: DollarSign,
      color: "text-green-500",
    },
    {
      title: "Low Stock",
      value: stats.lowStockItems,
      icon: BatteryWarning,
      color: "text-yellow-500",
    },
    {
      title: "Out of Stock",
      value: stats.outOfStockItems,
      icon: ArchiveX,
      color: "text-red-500",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statItems.map((item) => (
        <Card key={item.title} className="shadow-md transition-all hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
            <item.icon className={`h-4 w-4 text-muted-foreground ${item.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
