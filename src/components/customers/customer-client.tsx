
"use client";

import { useState, useMemo, useRef } from "react";
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
  const { customers, addBatchCustomers, addCustomer, updateCustomer, inventory } = useInventory();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [purchaseHistoryCustomer, setPurchaseHistoryCustomer] = useState<Customer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleAddCustomer = () => {
    setEditingCustomerId(null);
    setSheetOpen(true);
  };

  const handleEditCustomer = (id: string) => {
    setEditingCustomerId(id);
    setSheetOpen(true);
  };

  const handleViewPurchases = (customer: Customer) => {
    setPurchaseHistoryCustomer(customer);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setEditingCustomerId(null);
  };

  const customerPurchases = useMemo(() => {
    if (!purchaseHistoryCustomer) return [];
    return inventory.filter(item => item.customerId === purchaseHistoryCustomer.id);
  }, [inventory, purchaseHistoryCustomer]);

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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const customersToCreate: Omit<Customer, 'id'>[] = [];
        const customersToUpdate: Customer[] = [];

        json.forEach(row => {
          const name = row['name'] || row['Name'];
          const id = row['id'] || row['customerId'];
          
          if (!name) return; // Skip rows without a name

          const customerData = {
            id: id, // Keep id for update check
            name: name,
            contactPerson: row['contactPerson'] || row['Contact Person'] || '',
            phone: String(row['phone'] || row['Phone'] || ''),
            email: row['email'] || row['Email'] || '',
            address: row['address'] || row['Address'] || '',
          };

          const existingCustomer = customers.find(c => c.id === id);
          if (existingCustomer) {
            customersToUpdate.push(customerData);
          } else {
             // If ID is specified but not found, it's a new customer with a forced ID (restore case)
             // If ID is not specified, it's a completely new customer
             if(id) {
                customersToUpdate.push(customerData); // treat as update/set
             } else {
                const { id, ...createData } = customerData;
                customersToCreate.push(createData);
             }
          }
        });

        if (customersToCreate.length > 0) {
          await addBatchCustomers(customersToCreate);
        }
        if (customersToUpdate.length > 0) {
          for (const cust of customersToUpdate) {
            const { id, ...data } = cust;
            if (customers.some(c => c.id === id)) {
                await updateCustomer(id, data);
            } else {
                // This case handles restoring a customer with a specific ID that doesn't exist yet
                await addCustomer(data, id);
            }
          }
        }
        
        let description = '';
        if (customersToCreate.length > 0) description += `${customersToCreate.length} new customers added. `;
        if (customersToUpdate.length > 0) description += `${customersToUpdate.length} customers updated.`;
        if (!description) description = "No new customers or updates found in the file.";

        toast({
          title: "Import Complete",
          description: description,
        });

      } catch (error) {
         toast({
          variant: "destructive",
          title: "Import Failed",
          description: "There was an error processing the Excel file.",
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
      
      <DataTable columns={columns({ onEdit: handleEditCustomer, onViewPurchases: handleViewPurchases })} data={customers} />

      <PurchaseHistoryDrawer 
        customer={purchaseHistoryCustomer}
        purchases={customerPurchases}
        open={!!purchaseHistoryCustomer}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPurchaseHistoryCustomer(null);
        }}
      />
    </>
  );
}
