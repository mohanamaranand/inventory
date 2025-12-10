
"use client"

import { useInventory } from "@/context/inventory-context-firebase"
import { useMemo, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Image from "next/image"
import { formatCurrency } from "@/lib/utils"
import { SOLD_STATUSES } from "@/lib/types"
import { Button } from "../ui/button"

type SortKey = 'profit' | 'revenue';

export function TopPerformingProducts() {
  const { inventory } = useInventory()
  const [sortKey, setSortKey] = useState<SortKey>('profit');

  const topProducts = useMemo(() => {
    const productStats: {
      [key: string]: {
        name: string
        stdCode: string
        imageUrl?: string
        totalRevenue: number
        totalProfit: number
        unitsSold: number
      }
    } = {}

    inventory.forEach((item) => {
      if (SOLD_STATUSES.includes(item.itemStatus)) {
        const revenue = item.unitPrice * item.quantity;
        const profit = revenue - ((item.purchasePrice || 0) * item.quantity);

        if (!productStats[item.itemStdCode]) {
          productStats[item.itemStdCode] = {
            name: item.productName,
            stdCode: item.itemStdCode,
            imageUrl: item.imageUrl,
            totalRevenue: 0,
            totalProfit: 0,
            unitsSold: 0,
          }
        }
        productStats[item.itemStdCode].totalRevenue += revenue;
        productStats[item.itemStdCode].totalProfit += profit;
        productStats[item.itemStdCode].unitsSold += item.quantity;
      }
    });

    return Object.values(productStats)
      .sort((a, b) => {
          if (sortKey === 'profit') return b.totalProfit - a.totalProfit;
          return b.totalRevenue - a.totalRevenue;
      })
      .slice(0, 10);
  }, [inventory, sortKey]);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Top Performing Products</CardTitle>
                <CardDescription>Your best-selling products by {sortKey}.</CardDescription>
            </div>
            <div className="flex gap-2">
                <Button variant={sortKey === 'profit' ? 'default' : 'outline'} size="sm" onClick={() => setSortKey('profit')}>By Profit</Button>
                <Button variant={sortKey === 'revenue' ? 'default' : 'outline'} size="sm" onClick={() => setSortKey('revenue')}>By Revenue</Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Units Sold</TableHead>
                <TableHead className="text-right">Total Revenue</TableHead>
                <TableHead className="text-right">Total Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topProducts.length > 0 ? (
                topProducts.map((product, index) => (
                  <TableRow key={product.stdCode}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Image
                          src={product.imageUrl || `https://picsum.photos/seed/${product.stdCode}/40/40`}
                          alt={product.name}
                          width={40}
                          height={40}
                          className="rounded-md object-cover"
                          data-ai-hint="product image"
                        />
                        <div className="flex flex-col">
                            <span className="font-medium">{product.name}</span>
                            <span className="text-xs text-muted-foreground">{product.stdCode}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{product.unitsSold}</TableCell>
                    <TableCell className="text-right">{formatCurrency(product.totalRevenue)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(product.totalProfit)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No sales data available yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
