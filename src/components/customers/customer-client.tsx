
"use client";

import { useState } from "react";
import { useInventory } from "@/context/inventory-context";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { CustomerForm } from "./customer-form";
import { DataTable } from "./customer-table/data-table";
import { columns } from "./customer-table/columns";

export function CustomerClient() {
  const { customers } = useInventory();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);

  const handleAddCustomer = () => {
    setEditingCustomerId(null);
    setSheetOpen(true);
  };

  const handleEditCustomer = (id: string) => {
    setEditingCustomerId(id);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setEditingCustomerId(null);
  };

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
      
      <DataTable columns={columns({ onEdit: handleEditCustomer })} data={customers} />
    </>
  );
}
