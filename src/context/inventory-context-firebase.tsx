
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
  where,
  limit,
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
    item: Omit<InventoryItem, 'id'>
  ) => Promise<void>;
  addBatchItems: (
    items: Omit<InventoryItem, 'id'>[]
  ) => Promise<void>;
  updateItem: (
    id: string,
    updatedItem: Partial<Omit<InventoryItem, 'id'>>
  ) => Promise<void>;
  editAndMergeItem: (
    id: string,
    updatedItem: Omit<InventoryItem, 'id'>
  ) => Promise<void>;
  splitItem: (
    id: string,
    newStatus: ItemStatus,
    splitQuantity: number,
    splitItemData?: { productDetails?: string; salesInvoiceNumber?: string }
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

  const addBatchItems = useCallback(async (items: Omit<InventoryItem, 'id'>[]) => {
    if (!db) return;
    await runTransaction(db, async (transaction) => {
        for (const item of items) {
             const q = query(
                getCollectionRef('inventory'),
                where('itemStdCode', '==', item.itemStdCode),
                where('itemStatus', '==', item.itemStatus),
                where('productDetails', '==', item.productDetails || ''),
                where('purchaseInvoiceNumber', '==', item.purchaseInvoiceNumber),
                limit(1)
            );

            // Cannot run getDocs in a transaction. We will need to rethink this.
            // Let's query first and then run transaction. This is not ideal but a limitation.
        }
    });

    // The above is not correct. We must query outside transaction
    for (const item of items) {
        const q = query(
            getCollectionRef('inventory'),
            where('itemStdCode', '==', item.itemStdCode),
            where('itemStatus', '==', item.itemStatus),
            where('productDetails', '==', item.productDetails || ''),
            where('purchaseInvoiceNumber', '==', item.purchaseInvoiceNumber),
            limit(1)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const existingDoc = querySnapshot.docs[0];
            const existingData = existingDoc.data() as InventoryItem;
            const newQuantity = existingData.quantity + item.quantity;
            await updateDoc(existingDoc.ref, { quantity: newQuantity });
        } else {
            await addDoc(getCollectionRef('inventory'), { ...item, itemStatus: item.itemStatus || 'In Stock' });
        }
    }


  }, [db]);
  
  const addItem = useCallback(async (item: Omit<InventoryItem, 'id'>) => {
    await addBatchItems([{...item, itemStatus: 'In Stock'}]);
  }, [addBatchItems]);


  const updateItem = async (
    id: string,
    updatedItem: Partial<Omit<InventoryItem, 'id'>>
  ) => {
    const docRef = doc(db, 'inventory', id);
    await updateDoc(docRef, updatedItem);
  };
  
  const editAndMergeItem = useCallback(async (id: string, updatedItemData: Omit<InventoryItem, 'id'>) => {
     await runTransaction(db, async (transaction) => {
        // 1. Delete the original document.
        const originalDocRef = doc(db, 'inventory', id);
        transaction.delete(originalDocRef);

        // 2. Find a potential document to merge with.
        const q = query(
          getCollectionRef('inventory'),
          where('itemStdCode', '==', updatedItemData.itemStdCode),
          where('itemStatus', '==', updatedItemData.itemStatus),
          where('productDetails', '==', updatedItemData.productDetails || ''),
          where('purchaseInvoiceNumber', '==', updatedItemData.purchaseInvoiceNumber),
          limit(1)
        );
      
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty && querySnapshot.docs[0].id !== id) {
            const existingDoc = querySnapshot.docs[0];
            const existingData = existingDoc.data() as InventoryItem;
            const newQuantity = existingData.quantity + updatedItemData.quantity;
            transaction.update(existingDoc.ref, { quantity: newQuantity });
        } else {
            const newDocRef = doc(getCollectionRef('inventory'));
            transaction.set(newDocRef, updatedItemData);
        }
     });

  }, [db]);


  const splitItem = useCallback(async (id: string, newStatus: ItemStatus, splitQuantity: number, splitItemData?: { productDetails?: string; salesInvoiceNumber?: string }) => {
      await runTransaction(db, async (transaction) => {
        const itemDocRef = doc(db, 'inventory', id);
        const itemDoc = await transaction.get(itemDocRef);
        if (!itemDoc.exists()) {
          throw new Error('Document does not exist!');
        }
        const itemToSplit = { id: itemDoc.id, ...itemDoc.data() } as InventoryItem;

        if (splitQuantity <= 0 || splitQuantity > itemToSplit.quantity) {
          throw new Error('Invalid split quantity');
        }

        const { id: originalId, ...newItemData } = itemToSplit;
        const newDocPayload: Omit<InventoryItem, 'id'> = {
            ...newItemData,
            quantity: splitQuantity,
            itemStatus: newStatus,
            productDetails: splitItemData?.productDetails ?? newItemData.productDetails,
            salesInvoiceNumber: splitItemData?.salesInvoiceNumber ?? (newStatus.includes('Sold') ? newItemData.salesInvoiceNumber : ''),
        };

        const q = query(
            getCollectionRef('inventory'),
            where('itemStdCode', '==', newDocPayload.itemStdCode),
            where('itemStatus', '==', newDocPayload.itemStatus),
            where('productDetails', '==', newDocPayload.productDetails || ''),
            where('purchaseInvoiceNumber', '==', newDocPayload.purchaseInvoiceNumber),
            limit(1)
        );
        
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const existingDoc = querySnapshot.docs[0];
            const existingData = existingDoc.data() as InventoryItem;
            transaction.update(existingDoc.ref, { quantity: existingData.quantity + splitQuantity });
        } else {
            const newDocRef = doc(collection(db, 'inventory'));
            transaction.set(newDocRef, newDocPayload);
        }

        const remainingQuantity = itemToSplit.quantity - splitQuantity;
        if (remainingQuantity > 0) {
            transaction.update(itemDocRef, { quantity: remainingQuantity });
        } else {
            transaction.delete(itemDocRef);
        }
      });
  }, [db]);

  const deleteItem = async (id: string, restock: boolean = false) => {
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


  const getItem = useCallback((id: string) => {
      const item = inventory.find((item) => item.id === id);
      if (item) {
        // The useCollection hook already converts Timestamps to Dates.
        return item;
      }
      return undefined;
  }, [inventory]);

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
      if (!model || !model.parts) {
        throw new Error("Vehicle model or its parts not found.");
      }
  
      for (const part of model.parts) {
        const itemQuery = query(getCollectionRef('inventory'), where('itemStdCode', '==', part.itemStdCode), where('itemStatus', '==', 'In Stock'), limit(1));
        const itemSnapshot = await getDocs(itemQuery);
        if (itemSnapshot.empty || (itemSnapshot.docs[0].data() as InventoryItem).quantity < part.quantity) {
          throw new Error(`Insufficient stock for part code ${part.itemStdCode}.`);
        }
      }
  
      for (const part of model.parts) {
        const itemQuery = query(getCollectionRef('inventory'), where('itemStdCode', '==', part.itemStdCode), where('itemStatus', '==', 'In Stock'), limit(1));
        const itemSnapshot = await getDocs(itemQuery);
        const itemDoc = itemSnapshot.docs[0];
        const item = itemDoc.data() as InventoryItem;

        const newQuantity = item.quantity - part.quantity;
        if (newQuantity > 0) {
            transaction.update(itemDoc.ref, { quantity: newQuantity });
        } else {
            transaction.delete(itemDoc.ref);
        }
      }
  
      const assembledVehicleRef = doc(collection(db, 'assembledVehicles'));
      transaction.set(assembledVehicleRef, {
        ...vehicleData,
        assemblyDate: serverTimestamp(),
      });
  
      const totalCost = model.parts.reduce((sum, part) => {
          const item = getItemByStdCode(part.itemStdCode);
          return sum + (item ? item.unitPrice * part.quantity : 0);
      }, 0);

      const assembledItem: Omit<InventoryItem, 'id'> = {
          productName: model.name,
          productDetails: `Assembled vehicle with Chassis: ${vehicleData.chassisNumber}, Motor: ${vehicleData.motorNumber}`,
          itemStdCode: `ASM-V-${vehicleData.chassisNumber}`,
          itemCategory: 'Assembled Vehicle',
          quantity: 1,
          unitPrice: totalCost,
          itemStatus: 'Assembled',
          purchaseInvoiceNumber: 'ASSEMBLY',
          vendorName: 'In-House',
          storageLocation: 'Finished Goods',
          date: serverTimestamp() as Timestamp,
          imageUrl: '',
      };
      
      const newInventoryItemRef = doc(collection(db, 'inventory'));
      transaction.set(newInventoryItemRef, assembledItem);
    });
  };

  const deleteAssembledVehicle = async (id: string, restock: boolean = false) => {
    await runTransaction(db, async (transaction) => {
        const vehicleRef = doc(db, 'assembledVehicles', id);
        const vehicleDoc = await transaction.get(vehicleRef);
        if (!vehicleDoc.exists()) throw new Error("Assembled vehicle not found");
        
        const vehicle = vehicleDoc.data() as AssembledVehicle;
        const inventoryItemQuery = query(getCollectionRef('inventory'), where('itemStdCode', '==', `ASM-V-${vehicle.chassisNumber}`), limit(1));
        const inventorySnapshot = await getDocs(inventoryItemQuery);
        
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

        if (!inventorySnapshot.empty) {
            transaction.delete(inventorySnapshot.docs[0].ref);
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
      if (!model || !model.parts) {
          throw new Error("Battery model or its parts not found.");
      }

      for (const part of model.parts) {
        const itemQuery = query(getCollectionRef('inventory'), where('itemStdCode', '==', part.itemStdCode), where('itemStatus', '==', 'In Stock'), limit(1));
        const itemSnapshot = await getDocs(itemQuery);
        if (itemSnapshot.empty || (itemSnapshot.docs[0].data() as InventoryItem).quantity < part.quantity) {
          throw new Error(`Insufficient stock for part code ${part.itemStdCode}.`);
        }
      }

      for (const part of model.parts) {
          const itemQuery = query(getCollectionRef('inventory'), where('itemStdCode', '==', part.itemStdCode), where('itemStatus', '==', 'In Stock'), limit(1));
          const itemSnapshot = await getDocs(itemQuery);
          const itemDoc = itemSnapshot.docs[0];
          const item = itemDoc.data() as InventoryItem;
  
          const newQuantity = item.quantity - part.quantity;
          if (newQuantity > 0) {
              transaction.update(itemDoc.ref, { quantity: newQuantity });
          } else {
              transaction.delete(itemDoc.ref);
          }
      }

      const assembledBatteryRef = doc(collection(db, 'assembledBatteries'));
      transaction.set(assembledBatteryRef, {
          ...batteryData,
          assemblyDate: serverTimestamp(),
      });

      const totalCost = model.parts.reduce((sum, part) => {
        const item = getItemByStdCode(part.itemStdCode);
        return sum + (item ? item.unitPrice * part.quantity : 0);
      }, 0);

      const assembledItem: Omit<InventoryItem, 'id'> = {
        productName: model.name,
        productDetails: `Assembled battery with Serial: ${batteryData.serialNumber}`,
        itemStdCode: `ASM-B-${batteryData.serialNumber}`,
        itemCategory: 'Assembled Battery',
        quantity: 1,
        unitPrice: totalCost,
        itemStatus: 'Assembled',
        purchaseInvoiceNumber: 'ASSEMBLY',
        vendorName: 'In-House',
        storageLocation: 'Finished Goods',
        date: serverTimestamp() as Timestamp,
        imageUrl: '',
    };
    const newInventoryItemRef = doc(collection(db, 'inventory'));
    transaction.set(newInventoryItemRef, assembledItem);
  });
  };

  const deleteAssembledBattery = async (id: string, restock: boolean = false) => {
    await runTransaction(db, async (transaction) => {
        const batteryRef = doc(db, 'assembledBatteries', id);
        const batteryDoc = await transaction.get(batteryRef);
        if (!batteryDoc.exists()) throw new Error("Assembled battery not found");

        const battery = batteryDoc.data() as AssembledBattery;

        const inventoryItemQuery = query(getCollectionRef('inventory'), where('itemStdCode', '==', `ASM-B-${battery.serialNumber}`), limit(1));
        const inventorySnapshot = await getDocs(inventoryItemQuery);

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
        if (!inventorySnapshot.empty) {
            transaction.delete(inventorySnapshot.docs[0].ref);
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
              if (remainingQuantity > 0) {
                transaction.update(itemRef, { quantity: remainingQuantity });
              } else {
                transaction.delete(itemRef);
              }
          }
      });
  };

  const clearAllData = async () => {
    const collections = ['inventory', 'vehicleModels', 'assembledVehicles', 'batteryModels', 'assembledBatteries', 'customers'];
    for (const coll of collections) {
        const collRef = getCollectionRef(coll);
        const snapshot = await getDocs(query(collRef));
        if (snapshot.empty) continue;
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }
  };

  const restoreAllData = async (data: Partial<AllData>) => {
    await clearAllData();
    
    if (data.inventory) {
        const inventoryWithDates = data.inventory.map(item => ({
            ...item,
            date: item.date instanceof Timestamp ? item.date : Timestamp.fromDate(new Date(item.date as any))
        }))
        await addBatchItems(inventoryWithDates);
    }

    const batch = writeBatch(db);
    data.vehicleModels?.forEach(item => {
        const { id, ...itemData } = item;
        const docRef = doc(getCollectionRef('vehicleModels'), id);
        batch.set(docRef, itemData);
    });
    data.assembledVehicles?.forEach(item => {
        const { id, ...itemData } = item;
        const docRef = doc(getCollectionRef('assembledVehicles'), id);
        const date = item.assemblyDate instanceof Timestamp ? item.assemblyDate : Timestamp.fromDate(new Date(item.assemblyDate as any));
        batch.set(docRef, {...itemData, assemblyDate: date });
    });
    data.batteryModels?.forEach(item => {
        const { id, ...itemData } = item;
        const docRef = doc(getCollectionRef('batteryModels'), id);
        batch.set(docRef, itemData);
    });
    data.assembledBatteries?.forEach(item => {
        const { id, ...itemData } = item;
        const docRef = doc(getCollectionRef('assembledBatteries'), id);
        const date = item.assemblyDate instanceof Timestamp ? item.assemblyDate : Timestamp.fromDate(new Date(item.assemblyDate as any));
        batch.set(docRef, {...itemData, assemblyDate: date });
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
      editAndMergeItem,
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
      addItem,
      addBatchItems,
      splitItem,
      editAndMergeItem,
      deleteItem, deleteMultipleItems, updateItem, addVehicleModel, updateVehicleModel, assembleVehicle, deleteAssembledVehicle, addBatteryModel, updateBatteryModel, assembleBattery, deleteAssembledBattery, addCustomer, updateCustomer, deleteCustomer, processSale, clearAllData, restoreAllData
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
