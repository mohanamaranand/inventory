
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
import { useInventory } from "@/context/inventory-context-firebase"
import { SOLD_STATUSES } from "@/lib/types"
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

type ChartData = { month: string; sales: number; purchases: number }[];

export function SalesPurchasesChart() {
  const { inventory } = useInventory()
  const [chartData, setChartData] = React.useState<ChartData>([]);

  React.useEffect(() => {
    const today = new Date();
    const data: ChartData = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const month = date.toLocaleString('default', { month: 'short' });
      data.push({ month, sales: 0, purchases: 0 });
    }

    inventory.forEach(item => {
        if (!item.date) return;
        const itemDate = item.date; // No longer calling .toDate()
        const monthDiff = (today.getFullYear() - itemDate.getFullYear()) * 12 + (today.getMonth() - itemDate.getMonth());

        if (monthDiff >= 0 && monthDiff < 12) {
            const monthIndex = 11 - monthDiff;
            if (data[monthIndex]) {
                const value = item.quantity * item.unitPrice;
                
                if (SOLD_STATUSES.includes(item.itemStatus)) {
                data[monthIndex].sales += value;
                } else if (item.itemStatus === 'In Stock' || item.itemStatus === 'Assembled') {
                    data[monthIndex].purchases += value;
                }
            }
        }
    });

    setChartData(data);
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
