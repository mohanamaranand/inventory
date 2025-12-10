
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
import { Button } from "@/components/ui/button"
import { format, subDays, subMonths, subYears, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  cogs: {
    label: "COGS",
    color: "hsl(var(--chart-2))",
  },
  profit: {
    label: "Profit",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig

type ChartData = { label: string; revenue: number; cogs: number; profit: number }[];
type View = 'daily' | 'monthly' | 'yearly';

export function ProfitLossChart() {
  const { inventory } = useInventory();
  const [view, setView] = React.useState<View>('monthly');
  const [chartData, setChartData] = React.useState<ChartData>([]);

  React.useEffect(() => {
    const processData = () => {
      const now = new Date();
      let dataMap = new Map<string, { revenue: number, cogs: number }>();
      let labels: string[] = [];
      let formatLabel: (date: Date) => string;

      if (view === 'monthly') {
        formatLabel = (date) => format(date, 'MMM');
        for (let i = 11; i >= 0; i--) {
          const date = subMonths(now, i);
          const label = formatLabel(date);
          labels.push(label);
          dataMap.set(label, { revenue: 0, cogs: 0 });
        }
      } else if (view === 'yearly') {
        formatLabel = (date) => format(date, 'yyyy');
        for (let i = 4; i >= 0; i--) {
          const date = subYears(now, i);
          const label = formatLabel(date);
          labels.push(label);
          dataMap.set(label, { revenue: 0, cogs: 0 });
        }
      } else { // daily
        formatLabel = (date) => format(date, 'MMM d');
        for (let i = 29; i >= 0; i--) {
          const date = subDays(now, i);
          const label = formatLabel(date);
          labels.push(label);
          dataMap.set(label, { revenue: 0, cogs: 0 });
        }
      }

      inventory.forEach(item => {
        if (SOLD_STATUSES.includes(item.itemStatus) && item.salesDate) {
          const saleDate = item.salesDate;
          if (saleDate) {
            const label = formatLabel(saleDate);
            if (dataMap.has(label)) {
              const revenue = item.quantity * item.unitPrice;
              const cogs = item.quantity * (item.purchasePrice || 0);
              const current = dataMap.get(label)!;
              current.revenue += revenue;
              current.cogs += cogs;
            }
          }
        }
      });
      
      const data: ChartData = labels.map(label => {
        const values = dataMap.get(label) || { revenue: 0, cogs: 0 };
        return {
          label,
          revenue: values.revenue,
          cogs: values.cogs,
          profit: values.revenue - values.cogs,
        };
      });

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
        <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
                <CardTitle>Profit & Loss Overview</CardTitle>
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
        <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
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
                width={80}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatCurrency(Number(value))}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="profit" fill="var(--color-profit)" radius={4} />
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
            <Bar dataKey="cogs" fill="var(--color-cogs)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
