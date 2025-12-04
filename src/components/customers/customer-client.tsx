
"use client";

import { useState, useMemo } from "react";
import { useInventory } from "@/context/inventory-context-firebase";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { CustomerForm } from "./customer-form";
import { DataTable } from "./customer-table/data-table";
import { columns } from "./customer-table/columns";
import { PurchaseHistoryDrawer } from "./purchase-history-drawer";
import type { Customer, InventoryItem } from "@/lib/types";

export function CustomerClient() {
  const { customers, inventory } = useInventory();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [purchaseHistoryCustomer, setPurchaseHistoryCustomer] = useState<Customer | null>(null);

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


  return (
    <>
      <div className="flex justify-end mb-4">
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
