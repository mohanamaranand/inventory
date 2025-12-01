
"use client";

import React, { createContext, useContext, useState, ReactNode, useMemo, useRef, useCallback, useEffect } from "react";
import { type InventoryItem, type VehicleModel, type AssembledVehicle, type ItemStatus } from "@/lib/types";

interface AllData {
    inventory: InventoryItem[];
    vehicleModels: VehicleModel[];
    assembledVehicles: AssembledVehicle[];
}

interface InventoryContextType extends AllData {
  addItem: (item: Omit<InventoryItem, "id" | "itemStatus">) => void;
  addBatchItems: (items: Omit<InventoryItem, "id" | "itemStatus">[]) => void;
  updateItem: (id: string, updatedItem: Partial<InventoryItem>) => void;
  splitItem: (id: string, newStatus: ItemStatus, splitQuantity: number) => void;
  deleteItem: (id: string, restock?: boolean) => void;
  deleteMultipleItems: (ids: string[], restock?: boolean) => void;
  getItem: (id: string) => InventoryItem | undefined;
  getItemByStdCode: (stdCode: string) => InventoryItem | undefined;
  addVehicleModel: (model: Omit<VehicleModel, "id">) => void;
  updateVehicleModel: (id: string, updatedModel: Partial<VehicleModel>) => void;
  getVehicleModel: (id: string) => VehicleModel | undefined;
  assembleVehicle: (vehicle: Omit<AssembledVehicle, "id">) => void;
  deleteAssembledVehicle: (id: string, restock?: boolean) => void;
  clearAllData: () => void;
  restoreAllData: (data: AllData) => void;
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
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [vehicleModels, setVehicleModels] = useState<VehicleModel[]>([]);
  const [assembledVehicles, setAssembledVehicles] = useState<AssembledVehicle[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setInventory(getInitialState('inventory', []));
    setVehicleModels(getInitialState('vehicleModels', []));
    setAssembledVehicles(getInitialState('assembledVehicles', []));
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('inventory', JSON.stringify(inventory));
    }
  }, [inventory, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('vehicleModels', JSON.stringify(vehicleModels));
    }
  }, [vehicleModels, isLoaded]);

  useEffect(() => {
    if(isLoaded) {
      localStorage.setItem('assembledVehicles', JSON.stringify(assembledVehicles));
    }
  }, [assembledVehicles, isLoaded]);


  const nextId = useRef(inventory.length > 0 ? Math.max(...inventory.map(i => parseInt(i.id.split('-').pop() || '0'))) + 1 : 1);
  const nextModelId = useRef(vehicleModels.length > 0 ? Math.max(...vehicleModels.map(m => parseInt(m.id.split('-').pop() || '0'))) + 1 : 1);
  const nextVehicleId = useRef(assembledVehicles.length > 0 ? Math.max(...assembledVehicles.map(v => parseInt(v.id.split('-').pop() || '0'))) + 1 : 1);


  const addItem = (item: Omit<InventoryItem, "id" | "itemStatus"> & { itemStatus?: ItemStatus }) => {
    const newItem: InventoryItem = {
      ...item,
      id: `item-${nextId.current}`,
      itemStatus: item.itemStatus || (item.quantity === 0 ? "Out of Stock" : "In Stock"),
    };
    setInventory((prev) => [newItem, ...prev]);
    nextId.current += 1;
  };
  
  const addBatchItems = (items: Omit<InventoryItem, "id" | "itemStatus">[]) => {
    const newItems = items.map(item => {
      const newItem: InventoryItem = {
        ...item,
        id: `item-${nextId.current}`,
        itemStatus: item.quantity === 0 ? "Out of Stock" : "In Stock",
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
  
  const splitItem = (id: string, newStatus: ItemStatus, splitQuantity: number) => {
    const itemToSplit = getItem(id);
    if (!itemToSplit || splitQuantity <= 0 || splitQuantity > itemToSplit.quantity) {
        return;
    }

    const existingItemWithNewStatus = inventory.find(
        item => item.itemStdCode === itemToSplit.itemStdCode && 
                item.itemStatus === newStatus &&
                item.productDetails === itemToSplit.productDetails
    );

    if (splitQuantity === itemToSplit.quantity) {
        if (existingItemWithNewStatus) {
            updateItem(existingItemWithNewStatus.id, {
                quantity: existingItemWithNewStatus.quantity + splitQuantity,
            });
            deleteItem(itemToSplit.id, false); 
        } else {
            updateItem(itemToSplit.id, { itemStatus: newStatus });
        }
    } else {
        updateItem(id, { quantity: itemToSplit.quantity - splitQuantity });
        if (existingItemWithNewStatus) {
            updateItem(existingItemWithNewStatus.id, {
                quantity: existingItemWithNewStatus.quantity + splitQuantity,
            });
        } else {
            const splitPart: Omit<InventoryItem, "id" | "itemStatus"> = {
                ...itemToSplit,
                quantity: splitQuantity,
            };
            addItem({ ...splitPart, itemStatus: newStatus });
        }
    }
  };


  const deleteItem = (id: string, restock: boolean = false) => {
    const itemToDelete = inventory.find(item => item.id === id);
    if (itemToDelete && itemToDelete.itemCategory === 'Assembled Vehicle') {
        deleteAssembledVehicle(itemToDelete.itemStdCode, restock, true);
    }
    setInventory(prev => prev.filter(item => item.id !== id));
  };
  
  const deleteMultipleItems = (ids: string[], restock: boolean = false) => {
    const itemsToDelete = inventory.filter(item => ids.includes(item.id));
    const assembledItems = itemsToDelete.filter(item => item.itemCategory === 'Assembled Vehicle');
    
    if (assembledItems.length > 0) {
        assembledItems.forEach(item => {
            deleteAssembledVehicle(item.itemStdCode, restock, true);
        });
    }

    setInventory(prev => prev.filter(item => !ids.includes(item.id)));
  };

  const getItem = (id: string) => {
    return inventory.find(item => item.id === id);
  }

  const getItemByStdCode = useCallback((stdCode: string) => {
    return inventory.find(item => item.itemStdCode === stdCode && item.itemStatus === "In Stock") || inventory.find(item => item.itemStdCode === stdCode);
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

    for (const part of model.parts) {
      const inventoryItem = getItemByStdCode(part.itemStdCode);
      if (!inventoryItem || inventoryItem.quantity < part.quantity) {
        throw new Error(`Not enough stock for ${inventoryItem?.productName || part.itemStdCode}`);
      }
      totalCost += (inventoryItem.unitPrice || 0) * part.quantity;
    }

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

    addItem({...assembledVehicleItem, itemStatus: 'Assembled' });
  };

  const deleteAssembledVehicle = (idOrChassis: string, restock: boolean = false, fromInventory: boolean = false) => {
    const vehicleToDelete = fromInventory 
        ? assembledVehicles.find(v => v.chassisNumber === idOrChassis)
        : assembledVehicles.find(v => v.id === idOrChassis);

    if (!vehicleToDelete) return;

    if (restock) {
      const model = getVehicleModel(vehicleToDelete.modelId);
      if (model) {
        setInventory(prev => {
          const newInventory = [...prev];
          for (const part of model.parts) {
            const itemIndex = newInventory.findIndex(i => i.itemStdCode === part.itemStdCode);
            if (itemIndex > -1) {
              const updatedItem = { ...newInventory[itemIndex] };
              updatedItem.quantity += part.quantity;
              if (updatedItem.itemStatus === 'Out of Stock') {
                updatedItem.itemStatus = 'In Stock';
              }
              newInventory[itemIndex] = updatedItem;
            }
          }
          return newInventory;
        });
      }
    }
    
    if (!fromInventory) {
        setInventory(prev => prev.filter(item => item.itemStdCode !== vehicleToDelete.chassisNumber));
    }
    setAssembledVehicles(prev => prev.filter(v => v.id !== vehicleToDelete.id));
  };

  const clearAllData = () => {
    setInventory([]);
    setVehicleModels([]);
    setAssembledVehicles([]);
    nextId.current = 1;
    nextModelId.current = 1;
    nextVehicleId.current = 1;
  };

  const restoreAllData = (data: AllData) => {
    const sanitizedInventory = data.inventory.map(item => ({...item, date: new Date(item.date)}));
    const sanitizedAssembled = data.assembledVehicles.map(v => ({...v, assemblyDate: new Date(v.assemblyDate)}));
    
    setInventory(sanitizedInventory);
    setVehicleModels(data.vehicleModels);
    setAssembledVehicles(sanitizedAssembled);
    
    // Resetting IDs based on restored data
    const maxInvId = sanitizedInventory.length > 0 ? Math.max(...sanitizedInventory.map(i => parseInt(i.id.split('-').pop() || '0'))) : 0;
    nextId.current = maxInvId + 1;

    const maxModelId = data.vehicleModels.length > 0 ? Math.max(...data.vehicleModels.map(m => parseInt(m.id.split('-').pop() || '0'))) : 0;
    nextModelId.current = maxModelId + 1;

    const maxVehicleId = sanitizedAssembled.length > 0 ? Math.max(...sanitizedAssembled.map(v => parseInt(v.id.split('-').pop() || '0'))) : 0;
    nextVehicleId.current = maxVehicleId + 1;
  };


  const value = useMemo(() => ({
    inventory,
    addItem,
    addBatchItems,
    updateItem,
    splitItem,
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
    clearAllData,
    restoreAllData
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
