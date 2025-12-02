
"use client";

import React, { createContext, useContext, useState, ReactNode, useMemo, useRef, useCallback, useEffect } from "react";
import { type InventoryItem, type VehicleModel, type AssembledVehicle, type ItemStatus, type BatteryModel, type AssembledBattery, type Customer, SOLD_STATUSES } from "@/lib/types";

interface AllData {
    inventory: InventoryItem[];
    vehicleModels: VehicleModel[];
    assembledVehicles: AssembledVehicle[];
    batteryModels: BatteryModel[];
    assembledBatteries: AssembledBattery[];
    customers: Customer[];
}

interface SaleData {
    customerId: string;
    salesInvoiceNumber: string;
    date: Date;
    items: {
        itemId: string;
        quantity: number;
        unitPrice: number;
    }[];
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

  addBatteryModel: (model: Omit<BatteryModel, "id">) => void;
  updateBatteryModel: (id: string, updatedModel: Partial<BatteryModel>) => void;
  getBatteryModel: (id: string) => BatteryModel | undefined;
  
  assembleBattery: (battery: Omit<AssembledBattery, "id">) => void;
  deleteAssembledBattery: (id: string, restock?: boolean) => void;

  customers: Customer[];
  addCustomer: (customer: Omit<Customer, "id">) => void;
  updateCustomer: (id: string, updatedCustomer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  getCustomer: (id: string) => Customer | undefined;

  processSale: (saleData: SaleData) => void;

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
         if (key === 'assembledBatteries') {
            const parsed = JSON.parse(item);
            return parsed.map((b: any) => ({...b, assemblyDate: new Date(b.assemblyDate)}));
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
  const [batteryModels, setBatteryModels] = useState<BatteryModel[]>([]);
  const [assembledBatteries, setAssembledBatteries] = useState<AssembledBattery[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setInventory(getInitialState('inventory', []));
    setVehicleModels(getInitialState('vehicleModels', []));
    setAssembledVehicles(getInitialState('assembledVehicles', []));
    setBatteryModels(getInitialState('batteryModels', []));
    setAssembledBatteries(getInitialState('assembledBatteries', []));
    setCustomers(getInitialState('customers', []));
    setIsLoaded(true);
  }, []);

  useEffect(() => { if (isLoaded) localStorage.setItem('inventory', JSON.stringify(inventory)); }, [inventory, isLoaded]);
  useEffect(() => { if (isLoaded) localStorage.setItem('vehicleModels', JSON.stringify(vehicleModels)); }, [vehicleModels, isLoaded]);
  useEffect(() => { if(isLoaded) localStorage.setItem('assembledVehicles', JSON.stringify(assembledVehicles)); }, [assembledVehicles, isLoaded]);
  useEffect(() => { if(isLoaded) localStorage.setItem('batteryModels', JSON.stringify(batteryModels)); }, [batteryModels, isLoaded]);
  useEffect(() => { if(isLoaded) localStorage.setItem('assembledBatteries', JSON.stringify(assembledBatteries)); }, [assembledBatteries, isLoaded]);
  useEffect(() => { if(isLoaded) localStorage.setItem('customers', JSON.stringify(customers)); }, [customers, isLoaded]);


  const nextId = useRef(1);
  const nextModelId = useRef(1);
  const nextVehicleId = useRef(1);
  const nextBatteryModelId = useRef(1);
  const nextBatteryId = useRef(1);
  const nextCustomerId = useRef(1);

  useEffect(() => {
    if (isLoaded) {
        const maxId = inventory.length > 0 ? Math.max(...inventory.map(i => parseInt(i.id.split('-').pop() || '0'))) + 1 : 1;
        nextId.current = maxId;

        const maxModelId = vehicleModels.length > 0 ? Math.max(...vehicleModels.map(m => parseInt(m.id.split('-').pop() || '0'))) + 1 : 1;
        nextModelId.current = maxModelId;

        const maxVehicleId = assembledVehicles.length > 0 ? Math.max(...assembledVehicles.map(v => parseInt(v.id.split('-').pop() || '0'))) + 1 : 1;
        nextVehicleId.current = maxVehicleId;
        
        const maxBatteryModelId = batteryModels.length > 0 ? Math.max(...batteryModels.map(m => parseInt(m.id.split('-').pop() || '0'))) + 1 : 1;
        nextBatteryModelId.current = maxBatteryModelId;

        const maxBatteryId = assembledBatteries.length > 0 ? Math.max(...assembledBatteries.map(b => parseInt(b.id.split('-').pop() || '0'))) + 1 : 1;
        nextBatteryId.current = maxBatteryId;
        
        const maxCustomerId = customers.length > 0 ? Math.max(...customers.map(c => parseInt(c.id.split('-').pop() || '0'))) + 1 : 1;
        nextCustomerId.current = maxCustomerId;
    }
  }, [isLoaded, inventory, vehicleModels, assembledVehicles, batteryModels, assembledBatteries, customers]);


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
                item.productDetails === itemToSplit.productDetails &&
                item.salesInvoiceNumber === itemToSplit.salesInvoiceNumber
    );

    if (splitQuantity === itemToSplit.quantity) {
        if (existingItemWithNewStatus) {
            updateItem(existingItemWithNewStatus.id, {
                quantity: existingItemWithNewStatus.quantity + splitQuantity,
            });
            // Directly filter out the item to be deleted
            setInventory(prev => prev.filter(item => item.id !== itemToSplit.id));
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
    if (itemToDelete) {
        if (itemToDelete.itemCategory === 'Assembled Vehicle') {
            deleteAssembledVehicle(itemToDelete.itemStdCode, restock, true);
        } else if (itemToDelete.itemCategory === 'Assembled Battery') {
            deleteAssembledBattery(itemToDelete.itemStdCode, restock, true);
        }
    }
    setInventory(prev => prev.filter(item => item.id !== id));
  };
  
  const deleteMultipleItems = (ids: string[], restock: boolean = false) => {
    const itemsToDelete = inventory.filter(item => ids.includes(item.id));
    const assembledVehicles = itemsToDelete.filter(item => item.itemCategory === 'Assembled Vehicle');
    const assembledBatteries = itemsToDelete.filter(item => item.itemCategory === 'Assembled Battery');
    
    if (assembledVehicles.length > 0) {
        assembledVehicles.forEach(item => {
            deleteAssembledVehicle(item.itemStdCode, restock, true);
        });
    }
    if (assembledBatteries.length > 0) {
        assembledBatteries.forEach(item => {
            deleteAssembledBattery(item.itemStdCode, restock, true);
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


  const addBatteryModel = (model: Omit<BatteryModel, "id">) => {
    const newModel: BatteryModel = {
      ...model,
      id: `batt-model-${nextBatteryModelId.current}`,
    };
    setBatteryModels(prev => [newModel, ...prev]);
    nextBatteryModelId.current += 1;
  };

  const updateBatteryModel = (id: string, updatedModel: Partial<BatteryModel>) => {
    setBatteryModels(prev => prev.map(model => model.id === id ? { ...model, ...updatedModel } : model));
  };

  const getBatteryModel = (id: string) => {
    return batteryModels.find(model => model.id === id);
  };

  const assembleBattery = (battery: Omit<AssembledBattery, "id">) => {
    const model = getBatteryModel(battery.modelId);
    if (!model) {
      throw new Error("Battery model not found");
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

    const newBattery: AssembledBattery = {
      ...battery,
      id: `battery-${nextBatteryId.current}`,
    };
    setAssembledBatteries(prev => [newBattery, ...prev]);
    nextBatteryId.current += 1;

    const assembledBatteryItem: Omit<InventoryItem, 'id' | 'itemStatus'> = {
        purchaseInvoiceNumber: 'ASL-' + newBattery.id,
        vendorName: 'In-house Assembly',
        date: battery.assemblyDate,
        itemStdCode: battery.serialNumber,
        itemCategory: 'Assembled Battery',
        productName: model.name,
        productDetails: `Assembled battery with Serial No: ${battery.serialNumber}`,
        quantity: 1,
        storageLocation: 'Battery Storage',
        unitPrice: totalCost,
    };

    addItem({...assembledBatteryItem, itemStatus: 'Assembled' });
  };
  
  const deleteAssembledBattery = (idOrSerial: string, restock: boolean = false, fromInventory: boolean = false) => {
    const batteryToDelete = fromInventory
        ? assembledBatteries.find(b => b.serialNumber === idOrSerial)
        : assembledBatteries.find(b => b.id === idOrSerial);

    if (!batteryToDelete) return;

    if (restock) {
      const model = getBatteryModel(batteryToDelete.modelId);
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
        setInventory(prev => prev.filter(item => item.itemStdCode !== batteryToDelete.serialNumber));
    }
    setAssembledBatteries(prev => prev.filter(b => b.id !== batteryToDelete.id));
  };

  const addCustomer = (customer: Omit<Customer, 'id'>) => {
    const newCustomer: Customer = {
      ...customer,
      id: `cust-${nextCustomerId.current}`,
    };
    setCustomers((prev) => [newCustomer, ...prev]);
    nextCustomerId.current += 1;
  };

  const updateCustomer = (id: string, updatedCustomer: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((customer) => (customer.id === id ? { ...customer, ...updatedCustomer } : customer))
    );
  };

  const deleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((customer) => customer.id !== id));
  };
  
  const getCustomer = (id: string) => {
    return customers.find(customer => customer.id === id);
  }

  const processSale = (saleData: SaleData) => {
    let currentInventory = [...inventory];

    // Validate sale before processing
    for (const saleItem of saleData.items) {
      const inventoryItem = currentInventory.find(invItem => invItem.id === saleItem.itemId);
      if (!inventoryItem) {
        throw new Error(`Item with ID ${saleItem.itemId} not found.`);
      }
      if (inventoryItem.quantity < saleItem.quantity) {
        throw new Error(`Not enough stock for ${inventoryItem.productName}. Available: ${inventoryItem.quantity}, Requested: ${saleItem.quantity}`);
      }
    }
    
    const soldItemsToAdd: InventoryItem[] = [];

    currentInventory = currentInventory.map(invItem => {
        const saleItem = saleData.items.find(si => si.itemId === invItem.id);
        if (!saleItem) {
            return invItem;
        }

        const remainingQuantity = invItem.quantity - saleItem.quantity;
        
        // Create the sold item record
        const soldItem: InventoryItem = {
            ...invItem,
            id: `item-${nextId.current}`,
            quantity: saleItem.quantity,
            unitPrice: saleItem.unitPrice,
            date: saleData.date,
            itemStatus: invItem.itemCategory === 'Assembled Vehicle' || invItem.itemCategory === 'Assembled Battery' ? 'Sold as vehicle' : 'Sold as Spare',
            salesInvoiceNumber: saleData.salesInvoiceNumber,
        };
        soldItemsToAdd.push(soldItem);
        nextId.current += 1;

        if (remainingQuantity > 0) {
            return { ...invItem, quantity: remainingQuantity };
        } else {
            // This item is fully sold, so it shouldn't be in the 'In Stock' list anymore.
            // We return null and filter it out later.
            return null;
        }
    }).filter(Boolean) as InventoryItem[]; // Filter out null items
    
    // Add the new "sold" items to inventory
    setInventory([...currentInventory, ...soldItemsToAdd]);
  };

  const clearAllData = () => {
    setInventory([]);
    setVehicleModels([]);
    setAssembledVehicles([]);
    setBatteryModels([]);
    setCustomers([]);
    nextId.current = 1;
    nextModelId.current = 1;
    nextVehicleId.current = 1;
    nextBatteryModelId.current = 1;
    nextBatteryId.current = 1;
    nextCustomerId.current = 1;
  };

  const restoreAllData = (data: AllData) => {
    const sanitizedInventory = data.inventory.map(item => ({...item, date: new Date(item.date)}));
    const sanitizedAssembled = data.assembledVehicles.map(v => ({...v, assemblyDate: new Date(v.assemblyDate)}));
    const sanitizedAssembledBatteries = data.assembledBatteries.map(b => ({...b, assemblyDate: new Date(b.assemblyDate)}));
    
    setInventory(sanitizedInventory);
    setVehicleModels(data.vehicleModels);
    setAssembledVehicles(sanitizedAssembled);
    setBatteryModels(data.batteryModels || []);
    setAssembledBatteries(sanitizedAssembledBatteries || []);
    setCustomers(data.customers || []);
    
    // Resetting IDs based on restored data
    const maxInvId = sanitizedInventory.length > 0 ? Math.max(...sanitizedInventory.map(i => parseInt(i.id.split('-').pop() || '0'))) : 0;
    nextId.current = maxInvId + 1;

    const maxModelId = data.vehicleModels.length > 0 ? Math.max(...data.vehicleModels.map(m => parseInt(m.id.split('-').pop() || '0'))) : 0;
    nextModelId.current = maxModelId + 1;

    const maxVehicleId = sanitizedAssembled.length > 0 ? Math.max(...sanitizedAssembled.map(v => parseInt(v.id.split('-').pop() || '0'))) : 0;
    nextVehicleId.current = maxVehicleId + 1;

    const maxBatteryModelId = data.batteryModels?.length > 0 ? Math.max(...data.batteryModels.map(m => parseInt(m.id.split('-').pop() || '0'))) : 0;
    nextBatteryModelId.current = maxBatteryModelId + 1;

    const maxBatteryId = sanitizedAssembledBatteries?.length > 0 ? Math.max(...sanitizedAssembledBatteries.map(b => parseInt(b.id.split('-').pop() || '0'))) : 0;
    nextBatteryId.current = maxBatteryId + 1;

    const maxCustId = data.customers?.length > 0 ? Math.max(...data.customers.map(c => parseInt(c.id.split('-').pop() || '0'))) : 0;
    nextCustomerId.current = maxCustId + 1;
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
    batteryModels,
    addBatteryModel,
    updateBatteryModel,
    getBatteryModel,
    assembledBatteries,
    assembleBattery,
    deleteAssembledBattery,
    customers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomer,
    processSale,
    clearAllData,
    restoreAllData
  }), [inventory, vehicleModels, assembledVehicles, batteryModels, assembledBatteries, customers, getItemByStdCode]);

  return (
    <InventoryContext.Provider value={value}>
      {isLoaded ? children : null}
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

    

    