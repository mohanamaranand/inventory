"use client";

import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Upload } from "lucide-react";
import { useInventory } from "@/context/inventory-context";
import { InventoryForm } from "@/components/inventory/inventory-form";
import { DataTable } from "@/components/inventory/inventory-table/data-table";
import { columns } from "@/components/inventory/inventory-table/columns";
import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { ITEM_CATEGORIES, ITEM_STATUSES, InventoryItem } from "@/lib/types";

export default function InventoryPage() {
  const { inventory, addBatchItems, getItemByStdCode } = useInventory();
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
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);
        
        const newItems: Omit<InventoryItem, "id">[] = [];
        let skippedCount = 0;

        json.forEach((row) => {
          const itemStdCode = row["Item STD Code"] || row["itemStdCode"];
          
          if (!itemStdCode || getItemByStdCode(itemStdCode)) {
            skippedCount++;
            return;
          }

          const date = row["Date"] ? new Date(row["Date"]) : new Date();

          const newItem: Omit<InventoryItem, "id" | "itemStatus"> = {
            purchaseInvoiceNumber: String(row["Purchase Invoice Number"] || row["purchaseInvoiceNumber"] || ""),
            vendorName: String(row["Vendor Name"] || row["vendorName"] || ""),
            date: date,
            itemStdCode: String(itemStdCode),
            itemCategory: (row["Item Category"] || row["itemCategory"]) as any,
            productName: String(row["Product Name"] || row["productName"] || ""),
            productDetails: String(row["Product Details"] || row["productDetails"] || ""),
            quantity: Number(row["Quantity"] || row["quantity"] || 0),
            storageLocation: String(row["Storage Location"] || row["storageLocation"] || ""),
            unitPrice: Number(row["Unit Price"] || row["unitPrice"] || 0),
          };

          if (ITEM_CATEGORIES.includes(newItem.itemCategory)) {
             newItems.push(newItem);
          } else {
            skippedCount++;
          }
        });
        
        if(newItems.length > 0) {
            addBatchItems(newItems);
        }

        toast({
          title: "Import Complete",
          description: `${newItems.length} items were successfully imported. ${skippedCount} items were skipped (duplicates or invalid category).`,
        });

      } catch (error) {
        console.error("Error processing Excel file:", error);
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: "There was an error processing the Excel file.",
        });
      } finally {
        // Reset file input
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
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

      <DataTable columns={columns({ onEdit: handleEditItem })} data={inventory} />
    </>
  );
}
