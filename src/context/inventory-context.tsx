"use client";

import React, { createContext, useContext, useState, ReactNode, useMemo, useRef } from "react";
import { type InventoryItem } from "@/lib/types";
import { initialInventory } from "@/lib/data";

interface InventoryContextType {
  inventory: InventoryItem[];
  addItem: (item: Omit<InventoryItem, "id" | "itemStatus">) => void;
  updateItem: (id: string, updatedItem: Partial<InventoryItem>) => void;
  deleteItem: (id: string) => void;
  getItem: (id: string) => InventoryItem | undefined;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const nextId = useRef(initialInventory.length + 1);

  const addItem = (item: Omit<InventoryItem, "id" | "itemStatus">) => {
    const newItem: InventoryItem = {
      ...item,
      id: nextId.current.toString(),
      itemStatus: "In Stock",
    };
    setInventory((prev) => [newItem, ...prev]);
    nextId.current += 1;
  };

  const updateItem = (id: string, updatedItem: Partial<InventoryItem>) => {
    setInventory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updatedItem } : item))
    );
  };

  const deleteItem = (id: string) => {
    setInventory((prev) => prev.filter((item) => item.id !== id));
  };
  
  const getItem = (id: string) => {
    return inventory.find(item => item.id === id);
  }

  const value = useMemo(() => ({
    inventory,
    addItem,
    updateItem,
    deleteItem,
    getItem,
  }), [inventory]);

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error("useInventory must be used within an InventoryProvider");
  }
  return context;
};
