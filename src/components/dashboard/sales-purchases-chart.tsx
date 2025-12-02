
"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { useInventory } from "@/context/inventory-context"
import { SOLD_STATUSES, ITEM_STATUSES } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"

const chartConfig = {
  sales: {
    label: "Sales",
    color: "hsl(var(--chart-1))",
  },
  purchases: {
    label: "Purchases",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export function SalesPurchasesChart() {
  const { inventory } = useInventory()

  const chartData = React.useMemo(() => {
    const today = new Date();
    const data: { month: string; sales: number; purchases: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const month = date.toLocaleString('default', { month: 'short' });
      data.push({ month, sales: 0, purchases: 0 });
    }

    inventory.forEach(item => {
      const itemDate = new Date(item.date);
      const monthDiff = (today.getFullYear() - itemDate.getFullYear()) * 12 + (today.getMonth() - itemDate.getMonth());

      if (monthDiff >= 0 && monthDiff < 12) {
        const monthIndex = 11 - monthDiff;
        const value = item.quantity * item.unitPrice;
        
        if (SOLD_STATUSES.includes(item.itemStatus)) {
          data[monthIndex].sales += value;
        } else if (item.itemStatus === 'In Stock' || item.itemStatus === 'Assembled') {
            // This is a simplification; considers all non-sold as "purchase" in that month
            data[monthIndex].purchases += value;
        }
      }
    });

    return data;
  }, [inventory]);

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Sales & Purchases Overview</CardTitle>
        <CardDescription>Last 12 months</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
          <BarChart data={chartData} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
             <YAxis 
                tickFormatter={(value) => formatCurrency(Number(value)).replace(/₹/, '')}
                tickLine={false}
                tickMargin={10}
                axisLine={false}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatCurrency(Number(value))}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="purchases" fill="var(--color-purchases)" radius={4} />
            <Bar dataKey="sales" fill="var(--color-sales)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
