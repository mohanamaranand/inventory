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
  runTransaction,
  getDocs,
  query,
} from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
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
import { SOLD_STATUSES } from '@/lib/types';

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
    item: Omit<InventoryItem, 'id' | 'itemStatus'>
  ) => Promise<void>;
  addBatchItems: (
    items: Omit<InventoryItem, 'id' | 'itemStatus'>[]
  ) => Promise<void>;
  updateItem: (
    id: string,
    updatedItem: Partial<Omit<InventoryItem, 'id'>>
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
  restoreAllData: (data: Partial<AllData>) => Promise<void>;
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
    item: Omit<InventoryItem, 'id' | 'itemStatus'>
  ) => {
    await addDoc(getCollectionRef('inventory'), {
      ...item,
      itemStatus: item.quantity > 0 ? 'In Stock' : 'Out of Stock',
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
        itemStatus: item.quantity > 0 ? 'In Stock' : 'Out of Stock',
      });
    });
    await batch.commit();
  };

  const updateItem = async (
    id: string,
    updatedItem: Partial<Omit<InventoryItem, 'id'>>
  ) => {
    const docRef = doc(db, 'inventory', id);
    await updateDoc(docRef, updatedItem);
  };
  
  const splitItem = async (id: string, newStatus: ItemStatus, splitQuantity: number) => {
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
        const { id: originalId, ...newItemData } = itemToSplit;
        
        transaction.set(newDocRef, {
             ...newItemData,
             quantity: splitQuantity,
             itemStatus: newStatus,
             salesInvoiceNumber: newStatus.includes('Sold') ? itemToSplit.salesInvoiceNumber : '',
        });

        transaction.update(itemDocRef, { quantity: itemToSplit.quantity - splitQuantity });
      });
  };

  const deleteItem = async (id: string, restock: boolean = false) => {
     // This is complex, will implement with assembled items
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

  const assembleVehicle = async (vehicleData: Omit<AssembledVehicle, 'id' | 'assemblyDate'>) => {
    await runTransaction(db, async (transaction) => {
        const model = getVehicleModel(vehicleData.modelId);
        if (!model?.parts) throw new Error("Vehicle model or its parts not found.");

        for (const part of model.parts) {
            const item = getItemByStdCode(part.itemStdCode);
            if (!item || item.quantity < part.quantity) {
                throw new Error(`Insufficient stock for ${item?.productName || part.itemStdCode}. Required: ${part.quantity}, Available: ${item?.quantity || 0}`);
            }
        }

        const assembledVehicleRef = doc(collection(db, 'assembledVehicles'));
        transaction.set(assembledVehicleRef, {
            ...vehicleData,
            assemblyDate: serverTimestamp(),
        });

        for (const part of model.parts) {
            const item = getItemByStdCode(part.itemStdCode)!;
            const itemRef = doc(db, 'inventory', item.id);
            const newQuantity = item.quantity - part.quantity;
            transaction.update(itemRef, { quantity: newQuantity });
        }
    });
  };

  const deleteAssembledVehicle = async (id: string, restock: boolean = false) => {
    await runTransaction(db, async (transaction) => {
        const vehicleRef = doc(db, 'assembledVehicles', id);
        const vehicleDoc = await transaction.get(vehicleRef);
        if (!vehicleDoc.exists()) throw new Error("Assembled vehicle not found");
        
        const vehicle = vehicleDoc.data() as AssembledVehicle;
        
        if (restock) {
            const model = getVehicleModel(vehicle.modelId);
            if (model?.parts) {
                 for (const part of model.parts) {
                    const item = getItemByStdCode(part.itemStdCode);
                    if (item) {
                        const itemRef = doc(db, 'inventory', item.id);
                        transaction.update(itemRef, { quantity: item.quantity + part.quantity });
                    }
                }
            }
        }
        transaction.delete(vehicleRef);
    });
  };

  const addBatteryModel = async (model: Omit<BatteryModel, 'id'>) => {
    await addDoc(getCollectionRef('batteryModels'), model);
  };
  const updateBatteryModel = async (id: string, updatedModel: Partial<BatteryModel>) => {
    await updateDoc(doc(db, 'batteryModels', id), updatedModel);
  };
  const getBatteryModel = useCallback((id: string) => batteryModels.find(m => m.id === id), [batteryModels]);
  
  const assembleBattery = async (batteryData: Omit<AssembledBattery, 'id' | 'assemblyDate'>) => {
    await runTransaction(db, async (transaction) => {
        const model = getBatteryModel(batteryData.modelId);
        if (!model?.parts) throw new Error("Battery model or its parts not found.");

        for (const part of model.parts) {
            const item = getItemByStdCode(part.itemStdCode);
            if (!item || item.quantity < part.quantity) {
                throw new Error(`Insufficient stock for ${item?.productName || part.itemStdCode}. Required: ${part.quantity}, Available: ${item?.quantity || 0}`);
            }
        }

        const assembledBatteryRef = doc(collection(db, 'assembledBatteries'));
        transaction.set(assembledBatteryRef, {
            ...batteryData,
            assemblyDate: serverTimestamp(),
        });

        for (const part of model.parts) {
            const item = getItemByStdCode(part.itemStdCode)!;
            const itemRef = doc(db, 'inventory', item.id);
            const newQuantity = item.quantity - part.quantity;
            transaction.update(itemRef, { quantity: newQuantity });
        }
    });
  };

  const deleteAssembledBattery = async (id: string, restock: boolean = false) => {
    await runTransaction(db, async (transaction) => {
        const batteryRef = doc(db, 'assembledBatteries', id);
        const batteryDoc = await transaction.get(batteryRef);
        if (!batteryDoc.exists()) throw new Error("Assembled battery not found");

        const battery = batteryDoc.data() as AssembledBattery;

        if (restock) {
            const model = getBatteryModel(battery.modelId);
            if (model?.parts) {
                for (const part of model.parts) {
                    const item = getItemByStdCode(part.itemStdCode);
                    if (item) {
                        const itemRef = doc(db, 'inventory', item.id);
                        transaction.update(itemRef, { quantity: item.quantity + part.quantity });
                    }
                }
            }
        }
        transaction.delete(batteryRef);
    });
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
      await runTransaction(db, async (transaction) => {
          for (const saleItem of saleData.items) {
              const itemRef = doc(db, 'inventory', saleItem.itemId);
              const itemDoc = await transaction.get(itemRef);
              if (!itemDoc.exists()) throw new Error(`Item with ID ${saleItem.itemId} not found.`);

              const currentItem = itemDoc.data() as InventoryItem;
              if (currentItem.quantity < saleItem.quantity) {
                  throw new Error(`Insufficient stock for ${currentItem.productName}.`);
              }

              const newDocRef = doc(collection(db, 'inventory'));
              const { id: originalId, ...itemDataToCopy } = currentItem;
              
              const saleStatus: ItemStatus = itemDataToCopy.itemCategory === 'Assembled Vehicle' || itemDataToCopy.itemCategory === 'Assembled Battery'
                ? 'Sold as vehicle'
                : 'Sold as Spare';

              transaction.set(newDocRef, {
                  ...itemDataToCopy,
                  quantity: saleItem.quantity,
                  unitPrice: saleItem.unitPrice,
                  itemStatus: saleStatus,
                  salesInvoiceNumber: saleData.salesInvoiceNumber,
                  date: Timestamp.fromDate(saleData.date),
                  salesData: [...(currentItem.salesData || []), { date: saleData.date.toISOString(), quantitySold: saleItem.quantity }],
              });

              const remainingQuantity = currentItem.quantity - saleItem.quantity;
              transaction.update(itemRef, { quantity: remainingQuantity });
          }
      });
  };

  const clearAllData = async () => {
    const collections = ['inventory', 'vehicleModels', 'assembledVehicles', 'batteryModels', 'assembledBatteries', 'customers'];
    for (const coll of collections) {
        const collRef = getCollectionRef(coll);
        const snapshot = await getDocs(query(collRef));
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }
  };

  const restoreAllData = async (data: Partial<AllData>) => {
    await clearAllData();
    const batch = writeBatch(db);

    data.inventory?.forEach(item => {
        const { id, ...itemData } = item;
        const docRef = doc(getCollectionRef('inventory'), id);
        const date = item.date instanceof Timestamp ? item.date : (item.date as any).toDate ? (item.date as any).toDate() : new Date(item.date);
        batch.set(docRef, {...itemData, date: Timestamp.fromDate(date) });
    });
    data.vehicleModels?.forEach(item => {
        const { id, ...itemData } = item;
        const docRef = doc(getCollectionRef('vehicleModels'), id);
        batch.set(docRef, itemData);
    });
    data.assembledVehicles?.forEach(item => {
        const { id, ...itemData } = item;
        const docRef = doc(getCollectionRef('assembledVehicles'), id);
        const date = item.assemblyDate instanceof Timestamp ? item.assemblyDate : (item.assemblyDate as any).toDate ? (item.assemblyDate as any).toDate() : new Date(item.assemblyDate);
        batch.set(docRef, {...itemData, assemblyDate: Timestamp.fromDate(date) });
    });
    data.batteryModels?.forEach(item => {
        const { id, ...itemData } = item;
        const docRef = doc(getCollectionRef('batteryModels'), id);
        batch.set(docRef, itemData);
    });
    data.assembledBatteries?.forEach(item => {
        const { id, ...itemData } = item;
        const docRef = doc(getCollectionRef('assembledBatteries'), id);
        const date = item.assemblyDate instanceof Timestamp ? item.assemblyDate : (item.assemblyDate as any).toDate ? (item.assemblyDate as any).toDate() : new Date(item.assemblyDate);
        batch.set(docRef, {...itemData, assemblyDate: Timestamp.fromDate(date) });
    });
    data.customers?.forEach(item => {
        const { id, ...itemData } = item;
        const docRef = doc(getCollectionRef('customers'), id);
        batch.set(docRef, itemData);
    });
    await batch.commit();
  }

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
      restoreAllData
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
