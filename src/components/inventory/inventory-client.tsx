
'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useInventory } from '@/context/inventory-context-firebase';
import { Button } from '@/components/ui/button';
import { PlusCircle, Upload } from 'lucide-react';
import { InventoryForm } from '@/components/inventory/inventory-form';
import { DataTable } from '@/components/inventory/inventory-table/data-table';
import { columns } from '@/components/inventory/inventory-table/columns';
import { useToast } from '@/hooks/use-toast';
import { ITEM_CATEGORIES, InventoryItem } from '@/lib/types';

export function InventoryClient() {
  const { addBatchItems } = useInventory();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleAddItem = () => {
    setEditingItemId(null);
    setSheetOpen(true);
  };

  const handleEditItem = (id: string) => {
    setEditingItemId(id);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setEditingItemId(null);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const { id: toastId } = toast({
      title: 'Importing Data...',
      description: 'Parsing Excel file and processing rows. Please wait.',
    });

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
          await addBatchItems(newItems);
        }

        const descriptions = [];
        if (newItems.length > 0)
          descriptions.push(`${newItems.length} items processed for import.`);
        if (skippedCodeCount > 0)
          descriptions.push(
            `${skippedCodeCount} rows skipped due to missing 'Item STD Code'.`
          );
        if (skippedCategoryCount > 0)
          descriptions.push(
            `${skippedCategoryCount} rows skipped due to an invalid 'Item Category'.`
          );

        toast({
          id: toastId,
          title: 'Import Complete',
          description: descriptions.join(' ') || "No new data to import.",
        });
      } catch (error: any) {
        console.error('Error processing Excel file:', error);
        toast({
          id: toastId,
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

      <DataTable
        columns={columns({ onEdit: handleEditItem })}
        data={useInventory().inventory}
      />
    </>
  );
}
