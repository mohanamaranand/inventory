
"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { useInventory } from "@/context/inventory-context-firebase";
import { Button } from "@/components/ui/button";
import { PlusCircle, Upload, Download } from "lucide-react";
import { CustomerForm } from "./customer-form";
import { DataTable } from "./customer-table/data-table";
import { columns } from "./customer-table/columns";
import { PurchaseHistoryDrawer } from "./purchase-history-drawer";
import type { Customer, InventoryItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export function CustomerClient() {
  const { customers, addCustomer, updateCustomer, inventory } = useInventory();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [purchaseHistoryCustomer, setPurchaseHistoryCustomer] = useState<Customer | null>(null);
  const [purchaseHistoryOpen, setPurchaseHistoryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleAddCustomer = () => {
    setEditingCustomerId(null);
    setSheetOpen(true);
  };

  const handleEditCustomer = useCallback((id: string) => {
    setEditingCustomerId(id);
    setSheetOpen(true);
  }, []);

  const handleViewPurchases = useCallback((customer: Customer) => {
    setPurchaseHistoryCustomer(customer);
    setPurchaseHistoryOpen(true);
  }, []);

  const closeSheet = () => {
    setSheetOpen(false);
    setEditingCustomerId(null);
  };

  const customerPurchases = useMemo(() => {
    if (!purchaseHistoryCustomer) return [];
    return inventory.filter(item => item.customerId === purchaseHistoryCustomer.id);
  }, [inventory, purchaseHistoryCustomer]);

  const memoizedColumns = useMemo(
    () => columns({ onEdit: handleEditCustomer, onViewPurchases: handleViewPurchases }),
    [handleEditCustomer, handleViewPurchases]
  );

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(customers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
    XLSX.writeFile(workbook, "customers.xlsx");
    toast({
      title: "Customers Exported",
      description: "Your customer list has been downloaded.",
    });
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
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        json.forEach(row => {
          const name = row['name'] || row['Name'];
          if (!name) return; // Skip rows without a name

          addCustomer({
            name: name,
            contactPerson: row['contactPerson'] || row['Contact Person'] || '',
            phone: String(row['phone'] || row['Phone'] || ''),
            email: row['email'] || row['Email'] || '',
            address: row['address'] || row['Address'] || '',
          });
        });

        toast({
          title: "Import Complete",
          description: "Customer data has been imported.",
        });

      } catch (error) {
         toast({
          variant: "destructive",
          title: "Import Failed",
          description: "There was an error processing the Excel file.",
        });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };


  return (
    <>
      <div className="flex justify-end mb-4 gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".xlsx, .xls"
        />
        <Button variant="outline" onClick={handleImportClick}>
          <Upload className="mr-2 h-4 w-4" />
          Import
        </Button>
         <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
        <Button onClick={handleAddCustomer}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      <CustomerForm
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onFormSubmit={closeSheet}
        customerId={editingCustomerId}
      />
      
      <DataTable columns={memoizedColumns} data={customers} />

      <PurchaseHistoryDrawer 
        customer={purchaseHistoryCustomer}
        purchases={customerPurchases}
        open={purchaseHistoryOpen}
        onOpenChange={setPurchaseHistoryOpen}
      />
    </>
  );
}
