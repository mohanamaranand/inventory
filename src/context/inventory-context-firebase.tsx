'use client';

import React, {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useCallback,
} from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { useCollection, useDoc } from '@/firebase/firestore/use-collection';
import { useFirestore } from '@/firebase';

import type {
  InventoryItem,
  VehicleModel,
  AssembledVehicle,
  ItemStatus,
  BatteryModel,
  AssembledBattery,
  Customer,
} from '@/lib/types';
import { runTransaction } from 'firebase/firestore';

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
  loading: boolean;
  addItem: (
    item: Omit<InventoryItem, 'id' | 'itemStatus' | 'date'> & {
      date: Date | Timestamp;
    }
  ) => Promise<void>;
  addBatchItems: (
    items: Omit<InventoryItem, 'id' | 'itemStatus' | 'date'>[]
  ) => Promise<void>;
  updateItem: (
    id: string,
    updatedItem: Partial<Omit<InventoryItem, 'date'> & { date?: Date | Timestamp }>
  ) => Promise<void>;
  splitItem: (
    id: string,
    newStatus: ItemStatus,
    splitQuantity: number
  ) => Promise<void>;
  deleteItem: (id: string, restock?: boolean) => Promise<void>;
  deleteMultipleItems: (ids: string[], restock?: boolean) => Promise<void>;
  getItem: (id: string) => InventoryItem | undefined;
  getItemByStdCode: (stdCode: string) => InventoryItem | undefined;

  addVehicleModel: (model: Omit<VehicleModel, 'id'>) => Promise<void>;
  updateVehicleModel: (
    id: string,
    updatedModel: Partial<VehicleModel>
  ) => Promise<void>;
  getVehicleModel: (id: string) => VehicleModel | undefined;

  assembleVehicle: (
    vehicle: Omit<AssembledVehicle, 'id' | 'assemblyDate'>
  ) => Promise<void>;
  deleteAssembledVehicle: (id: string, restock?: boolean) => Promise<void>;

  addBatteryModel: (model: Omit<BatteryModel, 'id'>) => Promise<void>;
  updateBatteryModel: (
    id: string,
    updatedModel: Partial<BatteryModel>
  ) => Promise<void>;
  getBatteryModel: (id: string) => BatteryModel | undefined;

  assembleBattery: (
    battery: Omit<AssembledBattery, 'id' | 'assemblyDate'>
  ) => Promise<void>;
  deleteAssembledBattery: (id: string, restock?: boolean) => Promise<void>;

  addCustomer: (customer: Omit<Customer, 'id'>) => Promise<void>;
  updateCustomer: (
    id: string,
    updatedCustomer: Partial<Customer>
  ) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  getCustomer: (id: string) => Customer | undefined;

  processSale: (saleData: SaleData) => Promise<void>;

  clearAllData: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(
  undefined
);

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const db = useFirestore();

  const { data: inventory, loading: loadingInventory } =
    useCollection<InventoryItem>('inventory');
  const { data: vehicleModels, loading: loadingVehicleModels } =
    useCollection<VehicleModel>('vehicleModels');
  const { data: assembledVehicles, loading: loadingAssembledVehicles } =
    useCollection<AssembledVehicle>('assembledVehicles');
  const { data: batteryModels, loading: loadingBatteryModels } =
    useCollection<BatteryModel>('batteryModels');
  const { data: assembledBatteries, loading: loadingAssembledBatteries } =
    useCollection<AssembledBattery>('assembledBatteries');
  const { data: customers, loading: loadingCustomers } =
    useCollection<Customer>('customers');

  const loading =
    loadingInventory ||
    loadingVehicleModels ||
    loadingAssembledVehicles ||
    loadingBatteryModels ||
    loadingAssembledBatteries ||
    loadingCustomers;

  const getCollectionRef = (name: string) => collection(db, name);

  const addItem = async (
    item: Omit<InventoryItem, 'id' | 'itemStatus' | 'date'> & {
      date: Date | Timestamp;
    }
  ) => {
    await addDoc(getCollectionRef('inventory'), {
      ...item,
      itemStatus: item.quantity === 0 ? 'Out of Stock' : 'In Stock',
      date: item.date instanceof Timestamp ? item.date : Timestamp.fromDate(item.date),
    });
  };

  const addBatchItems = async (
    items: Omit<InventoryItem, 'id' | 'itemStatus'>[]
  ) => {
    const batch = writeBatch(db);
    items.forEach((item) => {
      const docRef = doc(getCollectionRef('inventory'));
      batch.set(docRef, {
        ...item,
        date: Timestamp.fromDate(item.date as Date),
        itemStatus: item.quantity === 0 ? 'Out of Stock' : 'In Stock',
      });
    });
    await batch.commit();
  };

  const updateItem = async (
    id: string,
    updatedItem: Partial<Omit<InventoryItem, 'date'> & { date?: Date | Timestamp }>
  ) => {
    const docRef = doc(db, 'inventory', id);
    const updateData = {...updatedItem};
    if (updateData.date && !(updateData.date instanceof Timestamp)) {
        updateData.date = Timestamp.fromDate(updateData.date);
    }
    await updateDoc(docRef, updateData);
  };
  
  const splitItem = async (id: string, newStatus: ItemStatus, splitQuantity: number) => {
      if (!db) return;
      await runTransaction(db, async (transaction) => {
        const itemDocRef = doc(db, 'inventory', id);
        const itemDoc = await transaction.get(itemDocRef);
        if (!itemDoc.exists()) {
          throw 'Document does not exist!';
        }
        const itemToSplit = { id: itemDoc.id, ...itemDoc.data() } as InventoryItem;

        if (splitQuantity <= 0 || splitQuantity > itemToSplit.quantity) {
          throw 'Invalid split quantity';
        }

        const newDocRef = doc(collection(db, 'inventory'));
        
        transaction.set(newDocRef, {
             ...itemToSplit,
             id: newDocRef.id,
             quantity: splitQuantity,
             itemStatus: newStatus,
        });

        transaction.update(itemDocRef, { quantity: itemToSplit.quantity - splitQuantity });
      });
  };

  const deleteItem = async (id: string, restock: boolean = false) => {
     // This is a simplified version. A full implementation would need to handle assembled items.
    await deleteDoc(doc(db, 'inventory', id));
  };
  
  const deleteMultipleItems = async (ids: string[], restock: boolean = false) => {
    const batch = writeBatch(db);
    ids.forEach(id => {
        const docRef = doc(db, 'inventory', id);
        batch.delete(docRef);
    });
    await batch.commit();
  };

  const getItem = useCallback((id: string) => inventory.find((item) => item.id === id), [inventory]);
  const getItemByStdCode = useCallback((stdCode: string) => inventory.find((item) => item.itemStdCode === stdCode), [inventory]);
  
  const addVehicleModel = async (model: Omit<VehicleModel, 'id'>) => {
    await addDoc(getCollectionRef('vehicleModels'), model);
  };
  const updateVehicleModel = async (id: string, updatedModel: Partial<VehicleModel>) => {
    await updateDoc(doc(db, 'vehicleModels', id), updatedModel);
  };
  const getVehicleModel = useCallback((id: string) => vehicleModels.find(m => m.id === id), [vehicleModels]);

  const assembleVehicle = async (vehicle: Omit<AssembledVehicle, 'id' | 'assemblyDate'>) => {
     // Simplified for brevity. A real implementation would use a transaction.
     const model = getVehicleModel(vehicle.modelId);
     if (!model) throw new Error("Model not found");

     const newVehicleId = doc(collection(db, 'assembledVehicles')).id;

     await addDoc(getCollectionRef('assembledVehicles'), {
         ...vehicle,
         id: newVehicleId,
         assemblyDate: serverTimestamp()
     });

     //Deduct parts from inventory
  };
  const deleteAssembledVehicle = async (id: string, restock: boolean = false) => {
    await deleteDoc(doc(db, 'assembledVehicles', id));
    // Add parts back to inventory if restock is true
  };

  const addBatteryModel = async (model: Omit<BatteryModel, 'id'>) => {
    await addDoc(getCollectionRef('batteryModels'), model);
  };
  const updateBatteryModel = async (id: string, updatedModel: Partial<BatteryModel>) => {
    await updateDoc(doc(db, 'batteryModels', id), updatedModel);
  };
  const getBatteryModel = useCallback((id: string) => batteryModels.find(m => m.id === id), [batteryModels]);
  
  const assembleBattery = async (battery: Omit<AssembledBattery, 'id' | 'assemblyDate'>) => {
    const newBatteryId = doc(collection(db, 'assembledBatteries')).id;
     await addDoc(getCollectionRef('assembledBatteries'), {
         ...battery,
         id: newBatteryId,
         assemblyDate: serverTimestamp()
     });
  };
  const deleteAssembledBattery = async (id: string, restock: boolean = false) => {
      await deleteDoc(doc(db, 'assembledBatteries', id));
  };
  
  const addCustomer = async (customer: Omit<Customer, 'id'>) => {
      await addDoc(getCollectionRef('customers'), customer);
  };
  const updateCustomer = async (id: string, updatedCustomer: Partial<Customer>) => {
      await updateDoc(doc(db, 'customers', id), updatedCustomer);
  };
  const deleteCustomer = async (id: string) => {
      await deleteDoc(doc(db, 'customers', id));
  };
  const getCustomer = useCallback((id: string) => customers.find(c => c.id === id), [customers]);

  const processSale = async (saleData: SaleData) => {
      // This is a complex transaction, simplified for this context.
      console.log("Processing sale:", saleData);
  }

  const clearAllData = async () => {
    // This would be a more complex operation, deleting all documents from all collections.
    console.log("Clearing all data...");
  };

  const value = useMemo(
    () => ({
      inventory,
      vehicleModels,
      assembledVehicles,
      batteryModels,
      assembledBatteries,
      customers,
      loading,
      addItem,
      addBatchItems,
      updateItem,
      splitItem,
      deleteItem,
      deleteMultipleItems,
      getItem,
      getItemByStdCode,
      addVehicleModel,
      updateVehicleModel,
      getVehicleModel,
      assembleVehicle,
      deleteAssembledVehicle,
      addBatteryModel,
      updateBatteryModel,
      getBatteryModel,
      assembleBattery,
      deleteAssembledBattery,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      getCustomer,
      processSale,
      clearAllData,
      restoreAllData: () => {}, // Placeholder
    }),
    [
      inventory,
      vehicleModels,
      assembledVehicles,
      batteryModels,
      assembledBatteries,
      customers,
      loading,
      getItem,
      getItemByStdCode,
      getVehicleModel,
      getBatteryModel,
      getCustomer,
    ]
  );

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
