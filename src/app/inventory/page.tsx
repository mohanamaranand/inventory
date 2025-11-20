"use client";

import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useInventory } from "@/context/inventory-context";
import { InventoryForm } from "@/components/inventory/inventory-form";
import { DataTable } from "@/components/inventory/inventory-table/data-table";
import { columns } from "@/components/inventory/inventory-table/columns";
import { useState } from "react";

export default function InventoryPage() {
  const { inventory } = useInventory();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

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

  return (
    <>
      <Header title="Inventory">
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
