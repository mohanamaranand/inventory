
"use client";

import { useInventory } from "@/context/inventory-context-firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Wrench, AlertOctagon, Eye } from "lucide-react";
import { useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface FaultyVehiclesWidgetProps {
    onEdit?: (id: string) => void;
}

export function FaultyVehiclesWidget({ onEdit }: FaultyVehiclesWidgetProps) {
  const { inventory } = useInventory();
  
  const faultyItems = useMemo(() => {
    return inventory.filter(item => 
        item.itemStatus === 'Fault' || item.itemStatus === 'Damaged'
    );
  }, [inventory]);

  if (faultyItems.length === 0) return null;

  return (
    <Card className="col-span-1 shadow-md border-red-200 bg-red-50/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-red-700">
                    <AlertOctagon className="h-5 w-5" />
                    Faulty / Damaged Items
                </CardTitle>
                <CardDescription>Items reported with faults needing repair.</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild className="h-8">
                <Link href="/inventory">View Inventory</Link>
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
            <TableHeader>
                <TableRow className="hover:bg-transparent">
                    <TableHead className="h-8">Item</TableHead>
                    <TableHead className="h-8">Description</TableHead>
                    <TableHead className="h-8 text-right">Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {faultyItems.map(item => (
                    <TableRow 
                        key={item.id} 
                        className={`hover:bg-red-100/50 border-b-red-100 ${onEdit ? 'cursor-pointer' : ''}`}
                        onClick={() => onEdit && onEdit(item.id)}
                    >
                        <TableCell className="py-2 font-medium">
                            <div className="flex flex-col">
                                <span>{item.productName}</span>
                                <span className="text-[10px] text-muted-foreground">{item.itemStdCode}</span>
                            </div>
                        </TableCell>
                        <TableCell className="py-2 text-xs" title={item.faultDescription}>
                            {item.faultDescription || 'No description'}
                        </TableCell>
                        <TableCell className="py-2 text-right">
                            <Badge variant="destructive" className="text-[10px]">{item.itemStatus}</Badge>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
