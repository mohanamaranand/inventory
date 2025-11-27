
"use client";

import React, { createContext, useContext, useState, ReactNode, useMemo, useRef, useCallback, useEffect } from "react";
import { type InventoryItem, type VehicleModel, type AssembledVehicle } from "@/lib/types";
import { initialInventory } from "@/lib/data";

interface InventoryContextType {
  inventory: InventoryItem[];
  addItem: (item: Omit<InventoryItem, "id" | "itemStatus">) => void;
  addBatchItems: (items: Omit<InventoryItem, "id" | "itemStatus">[]) => void;
  updateItem: (id: string, updatedItem: Partial<InventoryItem>) => void;
  deleteItem: (id: string) => void;
  deleteMultipleItems: (ids: string[]) => void;
  getItem: (id: string) => InventoryItem | undefined;
  getItemByStdCode: (stdCode: string) => InventoryItem | undefined;
  vehicleModels: VehicleModel[];
  addVehicleModel: (model: Omit<VehicleModel, "id">) => void;
  updateVehicleModel: (id: string, updatedModel: Partial<VehicleModel>) => void;
  getVehicleModel: (id: string) => VehicleModel | undefined;
  assembledVehicles: AssembledVehicle[];
  assembleVehicle: (vehicle: Omit<AssembledVehicle, "id">) => void;
  deleteAssembledVehicle: (id: string) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const getInitialState = <T,>(key: string, fallback: T): T => {
    if (typeof window === "undefined") {
      return fallback;
    }
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        // The date objects need to be reconstituted from strings
        if (key === 'inventory') {
            const parsed = JSON.parse(item);
            return parsed.map((i: any) => ({...i, date: new Date(i.date)}));
        }
         if (key === 'assembledVehicles') {
            const parsed = JSON.parse(item);
            return parsed.map((v: any) => ({...v, assemblyDate: new Date(v.assemblyDate)}));
        }
        return JSON.parse(item);
      }
    } catch (error) {
      console.warn(`Error reading localStorage key “${key}”:`, error);
    }
    return fallback;
  };

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>(() => getInitialState('inventory', initialInventory));
  const [vehicleModels, setVehicleModels] = useState<VehicleModel[]>(() => getInitialState('vehicleModels', []));
  const [assembledVehicles, setAssembledVehicles] = useState<AssembledVehicle[]>(() => getInitialState('assembledVehicles', []));

  useEffect(() => {
    localStorage.setItem('inventory', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('vehicleModels', JSON.stringify(vehicleModels));
  }, [vehicleModels]);

  useEffect(() => {
    localStorage.setItem('assembledVehicles', JSON.stringify(assembledVehicles));
  }, [assembledVehicles]);


  const nextId = useRef(inventory.length > 0 ? Math.max(...inventory.map(i => parseInt(i.id.split('-').pop() || '0'))) + 1 : 1);
  const nextModelId = useRef(vehicleModels.length > 0 ? Math.max(...vehicleModels.map(m => parseInt(m.id.split('-').pop() || '0'))) + 1 : 1);
  const nextVehicleId = useRef(assembledVehicles.length > 0 ? Math.max(...assembledVehicles.map(v => parseInt(v.id.split('-').pop() || '0'))) + 1 : 1);


  const addItem = (item: Omit<InventoryItem, "id" | "itemStatus">) => {
    const newItem: InventoryItem = {
      ...item,
      id: `item-${nextId.current}`,
      itemStatus: "In Stock",
    };
    setInventory((prev) => [newItem, ...prev]);
    nextId.current += 1;
  };
  
  const addBatchItems = (items: Omit<InventoryItem, "id" | "itemStatus">[]) => {
    const newItems = items.map(item => {
      const newItem: InventoryItem = {
        ...item,
        id: `item-${nextId.current}`,
        itemStatus: "In Stock",
      };
      nextId.current += 1;
      return newItem;
    });
    setInventory(prev => [...newItems, ...prev]);
  };

  const updateItem = (id: string, updatedItem: Partial<InventoryItem>) => {
    setInventory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updatedItem } : item))
    );
  };
  
  const deleteItem = (id: string) => {
    setInventory((prev) => prev.filter((item) => item.id !== id));
  };
  
  const deleteMultipleItems = (ids: string[]) => {
    setInventory((prev) => prev.filter((item) => !ids.includes(item.id)));
  };

  const getItem = (id: string) => {
    return inventory.find(item => item.id === id);
  }

  const getItemByStdCode = useCallback((stdCode: string) => {
    return inventory.find(item => item.itemStdCode === stdCode);
  }, [inventory]);

  const addVehicleModel = (model: Omit<VehicleModel, "id">) => {
    const newModel: VehicleModel = {
      ...model,
      id: `model-${nextModelId.current}`,
    };
    setVehicleModels(prev => [newModel, ...prev]);
    nextModelId.current += 1;
  };

  const updateVehicleModel = (id: string, updatedModel: Partial<VehicleModel>) => {
    setVehicleModels(prev => prev.map(model => model.id === id ? { ...model, ...updatedModel } : model));
  };

  const getVehicleModel = (id: string) => {
    return vehicleModels.find(model => model.id === id);
  };

  const assembleVehicle = (vehicle: Omit<AssembledVehicle, "id">) => {
    const model = getVehicleModel(vehicle.modelId);
    if (!model) {
      throw new Error("Vehicle model not found");
    }

    let totalCost = 0;

    // Check if there is enough stock
    for (const part of model.parts) {
      const inventoryItem = getItemByStdCode(part.itemStdCode);
      if (!inventoryItem || inventoryItem.quantity < part.quantity) {
        throw new Error(`Not enough stock for ${inventoryItem?.productName || part.itemStdCode}`);
      }
      totalCost += (inventoryItem.unitPrice || 0) * part.quantity;
    }

    // Reduce inventory
    setInventory(prev => {
      const newInventory = [...prev];
      for (const part of model.parts) {
        const itemIndex = newInventory.findIndex(i => i.itemStdCode === part.itemStdCode);
        if (itemIndex > -1) {
          const updatedItem = { ...newInventory[itemIndex] };
          updatedItem.quantity -= part.quantity;
          if(updatedItem.quantity === 0) {
            updatedItem.itemStatus = 'Out of Stock';
          }
          newInventory[itemIndex] = updatedItem;
        }
      }
      return newInventory;
    });

    const newVehicle: AssembledVehicle = {
      ...vehicle,
      id: `vehicle-${nextVehicleId.current}`,
    };
    setAssembledVehicles(prev => [newVehicle, ...prev]);
    nextVehicleId.current += 1;

    // Add assembled vehicle to inventory
    const assembledVehicleItem: Omit<InventoryItem, 'id' | 'itemStatus'> = {
        purchaseInvoiceNumber: 'ASL-' + newVehicle.id,
        vendorName: 'In-house Assembly',
        date: vehicle.assemblyDate,
        itemStdCode: vehicle.chassisNumber,
        itemCategory: 'Assembled Vehicle',
        productName: model.name,
        productDetails: `Assembled vehicle with Motor No: ${vehicle.motorNumber}`,
        quantity: 1,
        storageLocation: 'Showroom',
        unitPrice: totalCost,
    };

    addItem(assembledVehicleItem);
  };

  const deleteAssembledVehicle = (id: string) => {
    const vehicleToDelete = assembledVehicles.find(v => v.id === id);
    if (!vehicleToDelete) return;

    // Remove the corresponding item from the main inventory
    setInventory(prev => prev.filter(item => item.itemStdCode !== vehicleToDelete.chassisNumber));
    // Remove the vehicle from the assembled vehicles list
    setAssembledVehicles(prev => prev.filter(v => v.id !== id));
  };


  const value = useMemo(() => ({
    inventory,
    addItem,
    addBatchItems,
    updateItem,
    deleteItem,
    deleteMultipleItems,
    getItem,
    getItemByStdCode,
    vehicleModels,
    addVehicleModel,
    updateVehicleModel,
    getVehicleModel,
    assembledVehicles,
    assembleVehicle,
    deleteAssembledVehicle,
  }), [inventory, vehicleModels, assembledVehicles, getItemByStdCode]);

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
