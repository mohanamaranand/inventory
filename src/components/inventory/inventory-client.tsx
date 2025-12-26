'use client';

import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useInventory } from '@/context/inventory-context-firebase';
import { Button } from '@/components/ui/button';
import { PlusCircle, Upload, Download, AlertTriangle } from 'lucide-react';
import { InventoryForm } from '@/components/inventory/inventory-form';
import { DataTable } from '@/components/inventory/inventory-table/data-table';
import { useToast } from '@/hooks/use-toast';
import { ITEM_CATEGORIES, InventoryItem } from '@/lib/types';
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
import { formatCurrency } from '@/lib/utils';


export function InventoryClient() {
  const { addBatchItems } = useInventory();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [previewData, setPreviewData] = useState<Omit<InventoryItem, 'id'>[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);


  const handleAddItem = () => {
    setEditingItemId(null);
    setSheetOpen(true);
  };

  const handleEditItem = useCallback((id: string) => {
    setEditingItemId(id);
    setSheetOpen(true);
  }, []);

  const closeSheet = () => {
    setSheetOpen(false);
    setEditingItemId(null);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Purchase Invoice Number': 'INV-001',
        'Vendor Name': 'ABC Suppliers',
        'Purchase Date': new Date(),
        'Item STD Code': 'STD-123',
        'Item Category': 'Vehicle Part',
        'Product Name': 'Brake Pad',
        'Product Details': 'Front wheel brake pad',
        'Quantity': 100,
        'Storage Location': 'Shelf A1',
        'Unit Price': 50,
        'Purchase Price': 40,
        'Image URL': 'http://example.com/image.jpg'
      },
      {
        'Purchase Invoice Number': 'INV-002',
        'Vendor Name': 'XYZ Corp',
        'Purchase Date': new Date(),
        'Item STD Code': 'BAT-456',
        'Item Category': 'Battery Part',
        'Product Name': 'Lithium Cell',
        'Product Details': '3.7V 2500mAh',
        'Quantity': 500,
        'Storage Location': 'Bin B2',
        'Unit Price': 10,
        'Purchase Price': 8,
        'Image URL': ''
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    // Adjust column widths for better readability
    const wscols = [
      { wch: 25 }, // Purchase Invoice Number
      { wch: 20 }, // Vendor Name
      { wch: 15 }, // Purchase Date
      { wch: 15 }, // Item STD Code
      { wch: 20 }, // Item Category
      { wch: 20 }, // Product Name
      { wch: 30 }, // Product Details
      { wch: 10 }, // Quantity
      { wch: 20 }, // Storage Location
      { wch: 10 }, // Unit Price
      { wch: 15 }, // Purchase Price
      { wch: 30 }, // Image URL
    ];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, 'inventory_import_template.xlsx');
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const newItems: Omit<InventoryItem, 'id'>[] = [];
        
        let skippedCodeCount = 0;
        let skippedCategoryCount = 0;

        json.forEach((row) => {
          const itemStdCode = row['Item STD Code'] || row['itemStdCode'];

          if (!itemStdCode) {
            skippedCodeCount++;
            return;
          }

          const itemCategory = (row['Item Category'] || row['itemCategory']) as any;
          if (!ITEM_CATEGORIES.includes(itemCategory)) {
            skippedCategoryCount++;
            return;
          }

          const purchaseDateValue = row['Purchase Date'] || row['purchaseDate'];
          const purchaseDate = purchaseDateValue ? new Date(purchaseDateValue) : new Date();

          const itemData: Omit<InventoryItem, 'id'> = {
            purchaseInvoiceNumber: String(
              row['Purchase Invoice Number'] || row['purchaseInvoiceNumber'] || ''
            ),
            vendorName: String(row['Vendor Name'] || row['vendorName'] || ''),
            purchaseDate: purchaseDate,
            itemStdCode: String(itemStdCode),
            itemCategory: itemCategory,
            productName: String(row['Product Name'] || row['productName'] || ''),
            productDetails: String(
              row['Product Details'] || row['productDetails'] || ''
            ),
            quantity: Number(row['Quantity'] || row['quantity'] || 0),
            storageLocation: String(
              row['Storage Location'] || row['storageLocation'] || ''
            ),
            unitPrice: Number(row['Unit Price'] || row['unitPrice'] || 0),
            purchasePrice: Number(row['Purchase Price'] || row['purchasePrice'] || 0),
            itemStatus: 'In Stock',
            imageUrl: row['Image URL'] || row['imageUrl'] || '',
          };
          newItems.push(itemData);
        });

        if (newItems.length > 0) {
            setPreviewData(newItems);
            setIsPreviewOpen(true);
        } else {
             toast({
                variant: 'destructive',
                title: 'No Valid Data',
                description: "No valid inventory items were found in the file.",
            });
        }

        if (skippedCodeCount > 0 || skippedCategoryCount > 0) {
            toast({
                variant: 'warning',
                title: 'Rows Skipped',
                description: `${skippedCodeCount} rows missing Item Code, ${skippedCategoryCount} rows with invalid Category.`,
            });
        }

      } catch (error: any) {
        console.error('Error processing Excel file:', error);
        toast({
          variant: 'destructive',
          title: 'Import Failed',
          description: error.message || "There was an error processing the Excel file. Please ensure it's a valid .xlsx file and data format is correct.",
        });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };
  
  const confirmImport = async () => {
      setIsImporting(true);
      try {
          await addBatchItems(previewData);
          toast({
              title: 'Import Complete',
              description: `Successfully processed ${previewData.length} items.`,
          });
          setIsPreviewOpen(false);
          setPreviewData([]);
      } catch (error: any) {
          toast({
              variant: "destructive",
              title: "Import Failed",
              description: error.message || "An error occurred while saving the items."
          });
      } finally {
          setIsImporting(false);
      }
  }

  return (
    <>
      <div className="flex justify-end gap-2 mb-4">
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
          Import from Excel
        </Button>
        <Button onClick={handleAddItem}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>

      <InventoryForm
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onFormSubmit={closeSheet}
        itemId={editingItemId}
      />
      
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>Confirm Import</DialogTitle>
                <DialogDescription>
                    Please review the data before importing. This action will add {previewData.length} items to your inventory.
                    Existing items with the same Item Code and details will be updated (quantity added).
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[400px] border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Item Code</TableHead>
                            <TableHead>Product Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Unit Price</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {previewData.slice(0, 100).map((item, i) => (
                            <TableRow key={i}>
                                <TableCell className="font-medium">{item.itemStdCode}</TableCell>
                                <TableCell>{item.productName}</TableCell>
                                <TableCell>{item.itemCategory}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                            </TableRow>
                        ))}
                        {previewData.length > 100 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground">
                                    ... and {previewData.length - 100} more items
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
            <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>Ensure your "Item STD Code" is unique for new items. Matching codes will be treated as restocks.</span>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Cancel</Button>
                <Button onClick={confirmImport} disabled={isImporting}>
                    {isImporting ? "Importing..." : "Confirm & Import"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <DataTable
        data={useInventory().inventory}
        onEdit={handleEditItem}
      />
    </>
  );
}
