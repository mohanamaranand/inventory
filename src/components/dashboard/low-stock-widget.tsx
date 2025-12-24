
"use client";

import { useInventory } from "@/context/inventory-context-firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertOctagon } from "lucide-react";
import { useMemo } from "react";

export function LowStockWidget() {
  const { inventory } = useInventory();
  
  const lowStockItems = useMemo(() => {
    return inventory
        .filter(item => item.itemStatus === 'In Stock' && item.quantity > 0 && item.quantity < 5) // Assuming 5 is low stock threshold
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 5);
  }, [inventory]);

  if (lowStockItems.length === 0) return null;

  return (
    <Card className="col-span-1 shadow-md border-orange-200 bg-orange-50/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-orange-700">
            <AlertTriangle className="h-5 w-5" />
            Low Stock Alert
        </CardTitle>
        <CardDescription>Items running low on quantity.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
            <TableHeader>
                <TableRow className="hover:bg-transparent">
                    <TableHead className="h-8">Item</TableHead>
                    <TableHead className="h-8 text-right">Qty</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {lowStockItems.map(item => (
                    <TableRow key={item.id} className="hover:bg-transparent border-b-orange-100">
                        <TableCell className="py-2 font-medium">{item.productName}</TableCell>
                        <TableCell className="py-2 text-right text-orange-600 font-bold">{item.quantity}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
