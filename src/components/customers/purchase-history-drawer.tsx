
"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { Customer, InventoryItem } from "@/lib/types";
import { format } from "date-fns";
import { Timestamp } from "firebase/firestore";

type PurchaseHistoryDrawerProps = {
  customer: Customer | null;
  purchases: InventoryItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PurchaseHistoryDrawer({
  customer,
  purchases,
  open,
  onOpenChange,
}: PurchaseHistoryDrawerProps) {

  const handleDownload = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Date Sold,Product,Invoice #,Qty,Price,Total\n"
      + purchases.map(item => {
        const date = item.salesDate;
        const jsDate = date instanceof Timestamp ? date.toDate() : (date instanceof Date ? date : null);
        const isValidDate = jsDate && !isNaN(jsDate.getTime());
        return [
          isValidDate ? format(jsDate, "PPP") : 'N/A',
          `"${item.productName} (${item.itemStdCode})"`,
          item.salesInvoiceNumber,
          item.quantity,
          item.unitPrice,
          item.unitPrice * item.quantity
        ].join(",");
      }).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `purchase_history_${customer?.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-3xl w-full">
        <SheetHeader>
          <div className="flex justify-between items-center">
            <div>
              <SheetTitle>Purchase History: {customer?.name}</SheetTitle>
              <SheetDescription>
                A complete list of items purchased by {customer?.contactPerson}.
              </SheetDescription>
            </div>
            <Button onClick={handleDownload} disabled={purchases.length === 0}>
              Download
            </Button>
          </div>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] mt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date Sold</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.length > 0 ? (
                  purchases.map((item) => {
                    const date = item.salesDate;
                    const jsDate = date instanceof Timestamp ? date.toDate() : (date instanceof Date ? date : null);
                    const isValidDate = jsDate && !isNaN(jsDate.getTime());
                    return (
                        <TableRow key={item.id}>
                            <TableCell>{isValidDate ? format(jsDate, "PPP") : 'N/A'}</TableCell>
                            <TableCell className="font-medium">
                                <div>{item.productName}</div>
                                <div className="text-xs text-muted-foreground">{item.itemStdCode}</div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline">{item.salesInvoiceNumber}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.unitPrice * item.quantity)}</TableCell>
                        </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No purchases found for this customer.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
