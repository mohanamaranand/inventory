
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";


export function CustomerClient() {
  const { customers, addBatchCustomers, addCustomer, updateCustomer, inventory, clearAllCustomers } = useInventory();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [purchaseHistoryCustomer, setPurchaseHistoryCustomer] = useState<Customer | null>(null);
  const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [deleteBeforeImport, setDeleteBeforeImport] = useState(false);
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      setDeleteBeforeImport(false);
      setIsImportAlertOpen(true);
    }
     if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const confirmImport = async () => {
    if (!importFile) return;

    if (deleteBeforeImport) {
        await clearAllCustomers();
    }

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
          
          if (!name) return;

          const customerData = {
            id: id,
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
             if(id) {
                customersToUpdate.push(customerData); 
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
            await addCustomer(data, id);
          }
        }
        
        let description = '';
        if (customersToCreate.length > 0) description += `${customersToCreate.length} new customers added. `;
        if (customersToUpdate.length > 0) description += `${customersToUpdate.length} customers updated/restored.`;
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
        setImportFile(null);
        setIsImportAlertOpen(false);
      }
    };
    reader.readAsArrayBuffer(importFile);
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
      <AlertDialog open={isImportAlertOpen} onOpenChange={setIsImportAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Import Customers</AlertDialogTitle>
                <AlertDialogDescription>
                    You are about to import customers from <span className='font-bold'>{importFile?.name}</span>. This will add new customers and update existing ones based on their ID.
                </AlertDialogDescription>
            </AlertDialogHeader>
             <div className="flex items-center space-x-2">
                <Checkbox id="delete-before-import" checked={deleteBeforeImport} onCheckedChange={(checked) => setDeleteBeforeImport(!!checked)} />
                <Label htmlFor="delete-before-import" className='text-destructive font-bold'>Delete all existing customers before importing</Label>
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setImportFile(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmImport}>Confirm Import</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    