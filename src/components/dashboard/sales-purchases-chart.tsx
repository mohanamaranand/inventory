
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
import { Button } from "@/components/ui/button"
import { format, startOfMonth, startOfYear, startOfDay, subMonths, subYears, subDays, endOfDay, endOfMonth, endOfYear } from 'date-fns';

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

type ChartData = { label: string; sales: number; purchases: number }[];
type View = 'daily' | 'monthly' | 'yearly';

export function SalesPurchasesChart() {
  const { inventory } = useInventory()
  const [view, setView] = React.useState<View>('monthly');
  const [chartData, setChartData] = React.useState<ChartData>([]);

  React.useEffect(() => {
    const processData = () => {
      const now = new Date();
      let dataMap = new Map<string, { sales: number, purchases: number }>();
      let labels: string[] = [];
      let formatLabel: (date: Date) => string;

      if (view === 'monthly') {
        formatLabel = (date) => format(date, 'MMM');
        for (let i = 11; i >= 0; i--) {
          const date = subMonths(now, i);
          const label = formatLabel(date);
          labels.push(label);
          dataMap.set(label, { sales: 0, purchases: 0 });
        }
      } else if (view === 'yearly') {
        formatLabel = (date) => format(date, 'yyyy');
        for (let i = 4; i >= 0; i--) {
          const date = subYears(now, i);
          const label = formatLabel(date);
          labels.push(label);
          dataMap.set(label, { sales: 0, purchases: 0 });
        }
      } else { // daily
        formatLabel = (date) => format(date, 'MMM d');
        for (let i = 29; i >= 0; i--) {
          const date = subDays(now, i);
          const label = formatLabel(date);
          labels.push(label);
          dataMap.set(label, { sales: 0, purchases: 0 });
        }
      }

      inventory.forEach(item => {
        // Process Purchases
        if (item.purchaseDate) {
          const purchaseDate = item.purchaseDate instanceof Timestamp ? item.purchaseDate.toDate() : new Date(item.purchaseDate);
          if (!isNaN(purchaseDate.getTime())) {
            const label = formatLabel(purchaseDate);
            if (dataMap.has(label)) {
              const purchaseValue = item.quantity * (item.purchasePrice || 0);
              dataMap.get(label)!.purchases += purchaseValue;
            }
          }
        }

        // Process Sales
        if (SOLD_STATUSES.includes(item.itemStatus) && item.salesDate) {
          const saleDate = item.salesDate instanceof Timestamp ? item.salesDate.toDate() : new Date(item.salesDate);
          if (!isNaN(saleDate.getTime())) {
            const label = formatLabel(saleDate);
            if (dataMap.has(label)) {
              const saleValue = item.quantity * item.unitPrice;
              dataMap.get(label)!.sales += saleValue;
            }
          }
        }
      });
      
      const data: ChartData = labels.map(label => ({
        label,
        sales: dataMap.get(label)?.sales || 0,
        purchases: dataMap.get(label)?.purchases || 0,
      }));

      setChartData(data);
    };

    processData();
  }, [inventory, view]);

  const description = {
    daily: "Last 30 days",
    monthly: "Last 12 months",
    yearly: "Last 5 years"
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle>Sales & Purchases Overview</CardTitle>
                <CardDescription>{description[view]}</CardDescription>
            </div>
            <div className="flex gap-2">
                <Button variant={view === 'daily' ? 'default' : 'outline'} size="sm" onClick={() => setView('daily')}>Daily</Button>
                <Button variant={view === 'monthly' ? 'default' : 'outline'} size="sm" onClick={() => setView('monthly')}>Monthly</Button>
                <Button variant={view === 'yearly' ? 'default' : 'outline'} size="sm" onClick={() => setView('yearly')}>Yearly</Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
          <BarChart data={chartData} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tick={{ fontSize: 12 }}
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
