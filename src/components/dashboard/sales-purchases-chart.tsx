
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
import { Timestamp } from "firebase/firestore"

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
    const data: ChartData = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      return { month: date.toLocaleString('default', { month: 'short' }), sales: 0, purchases: 0 };
    }).reverse();

    inventory.forEach(item => {
        const itemDate = item.purchaseDate instanceof Timestamp ? item.purchaseDate.toDate() : new Date(item.purchaseDate);
        
        const monthDiff = (today.getFullYear() - itemDate.getFullYear()) * 12 + (today.getMonth() - itemDate.getMonth());

        if (monthDiff >= 0 && monthDiff < 12) {
            const monthIndex = 11 - monthDiff;
            if (data[monthIndex]) {
                const purchaseValue = item.quantity * (item.purchasePrice || 0);
                data[monthIndex].purchases += purchaseValue;
            }
        }
        
        if (SOLD_STATUSES.includes(item.itemStatus) && item.salesDate) {
            const saleDate = item.salesDate instanceof Timestamp ? item.salesDate.toDate() : new Date(item.salesDate);
            const saleMonthDiff = (today.getFullYear() - saleDate.getFullYear()) * 12 + (today.getMonth() - saleDate.getMonth());
            if(saleMonthDiff >=0 && saleMonthDiff < 12) {
                const monthIndex = 11 - saleMonthDiff;
                if(data[monthIndex]) {
                    const saleValue = item.quantity * item.unitPrice;
                    data[monthIndex].sales += saleValue;
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
