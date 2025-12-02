
"use client";

import { useInventory } from "@/context/inventory-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Boxes, DollarSign, Users, ShoppingCart } from "lucide-react";
import { useMemo } from "react";
import { SOLD_STATUSES } from "@/lib/types";

export function StatsCards() {
  const { inventory, customers } = useInventory();

  const stats = useMemo(() => {
    const totalItems = inventory.reduce((sum, item) => {
        if (item.itemStatus === 'In Stock' || item.itemStatus === 'Assembled') {
            return sum + item.quantity;
        }
        return sum;
    }, 0);

    const totalValue = inventory.reduce(
      (sum, item) => {
        if (item.itemStatus === 'In Stock' || item.itemStatus === 'Assembled') {
            return sum + item.quantity * item.unitPrice
        }
        return sum;
      },
      0
    );
    
    const totalSales = inventory.reduce((sum, item) => {
        if (SOLD_STATUSES.includes(item.itemStatus)) {
            return sum + item.quantity * item.unitPrice;
        }
        return sum;
    }, 0);

    const totalCustomers = customers.length;

    return { totalItems, totalValue, totalSales, totalCustomers };
  }, [inventory, customers]);

  const statItems = [
    {
      title: "Total Stock Value",
      value: formatCurrency(stats.totalValue),
      icon: DollarSign,
      color: "text-green-500",
    },
    {
      title: "Total Sales",
      value: formatCurrency(stats.totalSales),
      icon: ShoppingCart,
      color: "text-blue-500",
    },
    {
      title: "Total Units in Stock",
      value: stats.totalItems.toLocaleString(),
      icon: Boxes,
      color: "text-orange-500",
    },
    {
      title: "Total Customers",
      value: stats.totalCustomers,
      icon: Users,
      color: "text-purple-500",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statItems.map((item) => (
        <Card key={item.title} className="shadow-md transition-all hover:shadow-lg hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{item.title}</CardTitle>
            <item.icon className={`h-5 w-5 ${item.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
