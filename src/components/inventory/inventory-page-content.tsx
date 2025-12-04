
'use client';

import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Upload } from 'lucide-react';
import { useInventory } from '@/context/inventory-context-firebase';
import { InventoryForm } from '@/components/inventory/inventory-form';
import { DataTable } from '@/components/inventory/inventory-table/data-table';
import { columns } from '@/components/inventory/inventory-table/columns';
import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { ITEM_CATEGORIES, InventoryItem } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';

export function InventoryPageContent() {
  const { inventory, addBatchItems, getItemByStdCode, updateItem, loading } = useInventory();
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        const newItems: Omit<InventoryItem, 'id' | 'itemStatus'>[] = [];
        const itemsToUpdate: {id: string, data: Partial<InventoryItem>}[] = [];

        let skippedCodeCount = 0;
        let skippedCategoryCount = 0;

        json.forEach((row) => {
          const itemStdCode = row['Item STD Code'] || row['itemStdCode'];

          if (!itemStdCode) {
            skippedCodeCount++;
            return;
          }

          const itemCategory = (row['Item Category'] ||
            row['itemCategory']) as any;
          if (!ITEM_CATEGORIES.includes(itemCategory)) {
            skippedCategoryCount++;
            return;
          }

          const date = row['Purchase Date'] || row['purchaseDate'] ? new Date(row['Purchase Date'] || row['purchaseDate']) : new Date();

          const itemData: Omit<InventoryItem, 'id' | 'itemStatus'> = {
            purchaseInvoiceNumber: String(
              row['Purchase Invoice Number'] || row['purchaseInvoiceNumber'] || ''
            ),
            vendorName: String(row['Vendor Name'] || row['vendorName'] || ''),
            purchaseDate: Timestamp.fromDate(date),
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
          };

          const existingItem = getItemByStdCode(itemData.itemStdCode);
          if (existingItem) {
             const { id, ...updateData} = itemData;
             itemsToUpdate.push({ id: existingItem.id, data: updateData });
          } else {
            newItems.push(itemData);
          }
        });

        if (newItems.length > 0) {
          await addBatchItems(newItems);
        }

        if (itemsToUpdate.length > 0) {
            for (const item of itemsToUpdate) {
                await updateItem(item.id, item.data);
            }
        }

        const descriptions = [];
        if (newItems.length > 0)
          descriptions.push(`${newItems.length} new items added.`);
        if (itemsToUpdate.length > 0)
          descriptions.push(`${itemsToUpdate.length} existing items updated.`);
        if (skippedCodeCount > 0)
          descriptions.push(
            `${skippedCodeCount} rows skipped due to missing 'Item STD Code'.`
          );
        if (skippedCategoryCount > 0)
          descriptions.push(
            `${skippedCategoryCount} rows skipped due to an invalid 'Item Category'.`
          );

        toast({
          title: 'Import Complete',
          description: descriptions.join(' ') || "No new data to import.",
        });
      } catch (error) {
        console.error('Error processing Excel file:', error);
        toast({
          variant: 'destructive',
          title: 'Import Failed',
          description:
            "There was an error processing the Excel file. Please ensure it's a valid .xlsx file and data format is correct.",
        });
      } finally {
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <>
      <Header title="Inventory">
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
      </Header>

      <InventoryForm
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onFormSubmit={closeSheet}
        itemId={editingItemId}
      />

      <DataTable
        columns={columns({ onEdit: handleEditItem })}
        data={inventory}
      />
    </>
  );
}
