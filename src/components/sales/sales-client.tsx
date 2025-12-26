
"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useInventory } from "@/context/inventory-context-firebase";
import { DataTable } from "./sales-table/data-table";
import { columns } from "./sales-table/columns";
import { SOLD_STATUSES, type InventoryItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Download, Upload, PlusCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface SalePreviewItem {
    itemStdCode: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    customerId: string;
    salesInvoiceNumber: string;
    date: Date;
    error?: string;
    inventoryItem?: InventoryItem;
}

export function SalesClient() {
    const { inventory, processSale, customers } = useInventory();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [previewData, setPreviewData] = useState<SalePreviewItem[]>([]);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    const soldItems = useMemo(() => {
        return inventory.filter(item => SOLD_STATUSES.includes(item.itemStatus));
    }, [inventory]);

    const handleDownloadTemplate = () => {
        const templateData = [
            {
                'Sales Invoice Number': 'INV-SALE-001',
                'Item STD Code': 'MTR-2000',
                'Quantity': 1,
                'Unit Price': 15000,
                'Customer Phone/ID': '9876543210', // Can be phone or ID match if known
                'Sales Date': new Date(),
            },
            {
                'Sales Invoice Number': 'INV-SALE-001',
                'Item STD Code': 'WHL-14',
                'Quantity': 2,
                'Unit Price': 500,
                'Customer Phone/ID': '9876543210',
                'Sales Date': new Date(),
            }
        ];

        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const wscols = [
            { wch: 25 }, // Invoice
            { wch: 20 }, // Item Code
            { wch: 10 }, // Qty
            { wch: 15 }, // Unit Price
            { wch: 20 }, // Customer
            { wch: 15 }, // Date
        ];
        worksheet['!cols'] = wscols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Template');
        XLSX.writeFile(workbook, 'sales_import_template.xlsx');
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                const parsedItems: SalePreviewItem[] = [];
                const errors: string[] = [];

                json.forEach((row, index) => {
                    const rowNum = index + 2; // Excel row number (1-based, header is 1)
                    
                    const itemStdCode = String(row['Item STD Code'] || row['itemStdCode'] || '');
                    const quantity = Number(row['Quantity'] || row['quantity'] || 0);
                    const unitPrice = Number(row['Unit Price'] || row['unitPrice'] || 0);
                    const customerIdentifier = String(row['Customer Phone/ID'] || row['customerPhone'] || '');
                    const invoice = String(row['Sales Invoice Number'] || row['salesInvoiceNumber'] || '');
                    const dateVal = row['Sales Date'] || row['salesDate'];
                    const date = dateVal ? new Date(dateVal) : new Date();

                    if (!itemStdCode) {
                        errors.push(`Row ${rowNum}: Missing Item STD Code.`);
                        return;
                    }
                    if (quantity <= 0) {
                        errors.push(`Row ${rowNum}: Invalid quantity.`);
                        return;
                    }

                    // 1. Find Inventory Item
                    // We need to check 'In Stock' quantity specifically.
                    // But here we search by code. Note: There might be multiple batches.
                    // We assume we take from ANY 'In Stock' batch.
                    // For validation, we check if total available >= quantity.
                    
                    const availableItems = inventory.filter(i => i.itemStdCode === itemStdCode && i.itemStatus === 'In Stock');
                    const totalAvailable = availableItems.reduce((sum, i) => sum + i.quantity, 0);

                    // Find customer
                    const customer = customers.find(c => c.id === customerIdentifier || c.phone === customerIdentifier || c.name === customerIdentifier);
                    
                    const previewItem: SalePreviewItem = {
                        itemStdCode,
                        productName: availableItems[0]?.productName || 'Unknown Product',
                        quantity,
                        unitPrice,
                        customerId: customer?.id || '',
                        salesInvoiceNumber: invoice,
                        date,
                    };

                    if (totalAvailable === 0) {
                        previewItem.error = `Product not found or out of stock. (Code: ${itemStdCode})`;
                        errors.push(`Row ${rowNum}: Product '${itemStdCode}' not found or out of stock.`);
                    } else if (totalAvailable < quantity) {
                        previewItem.error = `Insufficient stock. Available: ${totalAvailable}`;
                        errors.push(`Row ${rowNum}: Insufficient stock for '${itemStdCode}'. Available: ${totalAvailable}, Requested: ${quantity}`);
                    }
                    
                    if (!customer && customerIdentifier) {
                         // We can allow "Unknown" customer, or error out. 
                         // Let's error out if they provided an ID but it wasn't found.
                         previewItem.error = previewItem.error ? `${previewItem.error}, Customer not found` : `Customer '${customerIdentifier}' not found`;
                         errors.push(`Row ${rowNum}: Customer '${customerIdentifier}' not found.`);
                    }

                    parsedItems.push(previewItem);
                });

                setPreviewData(parsedItems);
                setValidationErrors(errors);
                setIsPreviewOpen(true);

            } catch (error: any) {
                console.error("Error parsing sales file:", error);
                toast({
                    variant: "destructive",
                    title: "Import Failed",
                    description: "Failed to parse the Excel file."
                });
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const confirmImport = async () => {
        setIsImporting(true);
        try {
            // Group by Sale (same invoice, same customer, same date ideally)
            // But processSale function takes one sale event.
            // If the excel has multiple invoices, we should process them.
            // Let's group by Invoice Number + Customer ID to be safe.
            
            const salesMap = new Map<string, {
                customerId: string,
                salesInvoiceNumber: string,
                date: Date,
                items: { itemId: string, quantity: number, unitPrice: number }[]
            }>();

            // We need to map itemStdCode to specific inventory item IDs.
            // This is complex because we might need to take from multiple batches.
            // processSale expects item IDs.
            // We'll do a "Best Fit" allocation here.
            
            for (const row of previewData) {
                if (row.error) continue; // Skip error rows? Or block import? Let's block.

                const availableBatches = inventory
                    .filter(i => i.itemStdCode === row.itemStdCode && i.itemStatus === 'In Stock')
                    .sort((a, b) => a.quantity - b.quantity); // Use smaller batches first? or larger?

                let remainingQty = row.quantity;
                
                for (const batch of availableBatches) {
                    if (remainingQty <= 0) break;
                    const take = Math.min(batch.quantity, remainingQty);
                    
                    const key = `${row.salesInvoiceNumber}-${row.customerId}`;
                    if (!salesMap.has(key)) {
                        salesMap.set(key, {
                            customerId: row.customerId,
                            salesInvoiceNumber: row.salesInvoiceNumber,
                            date: row.date,
                            items: []
                        });
                    }
                    
                    salesMap.get(key)!.items.push({
                        itemId: batch.id,
                        quantity: take,
                        unitPrice: row.unitPrice
                    });
                    
                    remainingQty -= take;
                }
            }

            for (const sale of salesMap.values()) {
                await processSale(sale);
            }

            toast({
                title: "Import Successful",
                description: `Processed ${salesMap.size} sales orders.`
            });
            setIsPreviewOpen(false);
            setPreviewData([]);
            setValidationErrors([]);

        } catch (error: any) {
             toast({
                variant: "destructive",
                title: "Import Failed",
                description: error.message || "An error occurred while processing sales."
            });
        } finally {
            setIsImporting(false);
        }
    };

    const hasErrors = previewData.some(i => i.error);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                 <div className="flex gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".xlsx, .xls"
                    />
                    <Button variant="outline" onClick={handleDownloadTemplate}>
                        <Download className="mr-2 h-4 w-4" />
                        Download Template
                    </Button>
                    <Button variant="outline" onClick={handleImportClick}>
                        <Upload className="mr-2 h-4 w-4" />
                        Import Sales
                    </Button>
                </div>
                <Button asChild>
                    <Link href="/sales/create">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Sale
                    </Link>
                </Button>
            </div>

            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Confirm Sales Import</DialogTitle>
                        <DialogDescription>
                            Review the sales data. {validationErrors.length > 0 && <span className="text-destructive font-bold">Errors found!</span>}
                        </DialogDescription>
                    </DialogHeader>
                    
                    {validationErrors.length > 0 && (
                        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive max-h-32 overflow-y-auto mb-4">
                            <p className="font-semibold mb-2">{validationErrors.length} Errors Found:</p>
                            <ul className="list-disc pl-4 space-y-1">
                                {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                            </ul>
                        </div>
                    )}

                    <ScrollArea className="h-[400px] border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Invoice</TableHead>
                                    <TableHead>Item Code</TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Qty</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {previewData.map((item, i) => (
                                    <TableRow key={i} className={item.error ? "bg-destructive/5" : ""}>
                                        <TableCell>{item.salesInvoiceNumber}</TableCell>
                                        <TableCell>{item.itemStdCode}</TableCell>
                                        <TableCell>{item.productName}</TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                                        <TableCell className="text-xs">{item.customerId || 'Unknown'}</TableCell>
                                        <TableCell>
                                            {item.error ? (
                                                <div className="flex items-center text-destructive text-xs font-medium">
                                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                                    {item.error}
                                                </div>
                                            ) : (
                                                <span className="text-green-600 text-xs font-medium">Ready</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Cancel</Button>
                        <Button onClick={confirmImport} disabled={isImporting || hasErrors} variant={hasErrors ? "destructive" : "default"}>
                            {isImporting ? "Processing..." : hasErrors ? "Fix Errors in Excel" : "Confirm & Process Sales"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <DataTable columns={columns} data={soldItems} />
        </div>
    );
}
