
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
import { useAuth, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { deleteUser as deleteFirebaseAuthUser } from 'firebase/auth';

import type {
  InventoryItem,
  VehicleModel,
  AssembledVehicle,
  ItemStatus,
  BatteryModel,
  AssembledBattery,
  Customer,
  AllData,
} from '@/lib/types';
import { SOLD_STATUSES } from '@/lib/types';


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

interface InventoryContextType {
  inventory: InventoryItem[];
  vehicleModels: VehicleModel[];
  assembledVehicles: AssembledVehicle[];
  batteryModels: BatteryModel[];
  assembledBatteries: AssembledBattery[];
  customers: Customer[];
  loading: boolean;
  addItem: (
    item: Omit<InventoryItem, 'id'>
  ) => Promise<void>;
  addBatchItems: (
    items: Omit<InventoryItem, 'id' | 'itemStatus'>[]
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
    splitItemData?: { productDetails?: string; salesInvoiceNumber?: string, salesDate?: Date }
  ) => Promise<void>;
  deleteItem: (id: string, restock?: boolean) => Promise<void>;
  deleteMultipleItems: (ids: string[], restock?: boolean) => Promise<void>;
  deleteCurrentUser: () => Promise<void>;
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

  addCustomer: (customer: Omit<Customer, 'id'>, id?: string) => Promise<void>;
  addBatchCustomers: (customers: Omit<Customer, 'id'>[]) => Promise<void>;
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
  const auth = useAuth();
  
  const inventoryQuery = useMemoFirebase(() => db ? collection(db, 'inventory') : null, [db]);
  const vehicleModelsQuery = useMemoFirebase(() => db ? collection(db, 'vehicleModels') : null, [db]);
  const assembledVehiclesQuery = useMemoFirebase(() => db ? collection(db, 'assembledVehicles') : null, [db]);
  const batteryModelsQuery = useMemoFirebase(() => db ? collection(db, 'batteryModels') : null, [db]);
  const assembledBatteriesQuery = useMemoFirebase(() => db ? collection(db, 'assembledBatteries') : null, [db]);
  const customersQuery = useMemoFirebase(() => db ? collection(db, 'customers') : null, [db]);

  const { data: inventoryData, isLoading: loadingInventory } = useCollection<InventoryItem>(inventoryQuery);
  const { data: vehicleModelsData, isLoading: loadingVehicleModels } = useCollection<VehicleModel>(vehicleModelsQuery);
  const { data: assembledVehiclesData, isLoading: loadingAssembledVehicles } = useCollection<AssembledVehicle>(assembledVehiclesQuery);
  const { data: batteryModelsData, isLoading: loadingBatteryModels } = useCollection<BatteryModel>(batteryModelsQuery);
  const { data: assembledBatteriesData, isLoading: loadingAssembledBatteries } = useCollection<AssembledBattery>(assembledBatteriesQuery);
  const { data: customersData, isLoading: loadingCustomers } = useCollection<Customer>(customersQuery);

  const inventory = useMemo(() => (inventoryData || []).map(item => ({ ...item, purchaseDate: item.purchaseDate instanceof Timestamp ? item.purchaseDate.toDate() : item.purchaseDate })), [inventoryData]);
  const vehicleModels = useMemo(() => vehicleModelsData || [], [vehicleModelsData]);
  const assembledVehicles = useMemo(() => (assembledVehiclesData || []).map(item => ({ ...item, assemblyDate: item.assemblyDate instanceof Timestamp ? item.assemblyDate.toDate() : item.assemblyDate })), [assembledVehiclesData]);
  const batteryModels = useMemo(() => batteryModelsData || [], [batteryModelsData]);
  const assembledBatteries = useMemo(() => (assembledBatteriesData || []).map(item => ({ ...item, assemblyDate: item.assemblyDate instanceof Timestamp ? item.assemblyDate.toDate() : item.assemblyDate })), [assembledBatteriesData]);
  const customers = useMemo(() => customersData || [], [customersData]);


  const loading =
    loadingInventory ||
    loadingVehicleModels ||
    loadingAssembledVehicles ||
    loadingBatteryModels ||
    loadingAssembledBatteries ||
    loadingCustomers;

  const getCollectionRef = (name: string) => collection(db, name);

  const addBatchItems = useCallback(async (items: Omit<InventoryItem, 'id' | 'itemStatus'>[]) => {
    if (!db) return;
  
    for (const item of items) {
      await runTransaction(db, async (transaction) => {
        const q = query(
          getCollectionRef('inventory'),
          where('itemStdCode', '==', item.itemStdCode),
          where('itemStatus', '==', 'In Stock'),
          limit(1)
        );
  
        const querySnapshot = await getDocs(q);
  
        if (!querySnapshot.empty) {
          const existingDoc = querySnapshot.docs[0];
          const existingData = existingDoc.data() as InventoryItem;
          const newQuantity = existingData.quantity + item.quantity;
          transaction.update(existingDoc.ref, { quantity: newQuantity });
        } else {
          const docRef = doc(getCollectionRef('inventory'));
          transaction.set(docRef, { ...item, itemStatus: 'In Stock' });
        }
      });
    }
  }, [db]);
  
  const addItem = useCallback(async (item: Omit<InventoryItem, 'id'>) => {
    if (!db) return;
    await runTransaction(db, async (transaction) => {
      const q = query(
        getCollectionRef('inventory'),
        where('itemStdCode', '==', item.itemStdCode),
        where('itemStatus', '==', item.itemStatus),
        where('productName', '==', item.productName),
        where('unitPrice', '==', item.unitPrice),
        where('vendorName', '==', item.vendorName),
        where('purchaseInvoiceNumber', '==', item.purchaseInvoiceNumber),
        limit(1)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const existingDoc = querySnapshot.docs[0];
        const existingData = existingDoc.data() as InventoryItem;
        const newQuantity = existingData.quantity + item.quantity;
        transaction.update(existingDoc.ref, { quantity: newQuantity });
      } else {
        const docRef = doc(getCollectionRef('inventory'));
        transaction.set(docRef, { ...item });
      }
    });
  }, [db]);


  const updateItem = async (
    id: string,
    updatedItem: Partial<Omit<InventoryItem, 'id'>>
  ) => {
    const docRef = doc(db, 'inventory', id);
    await updateDoc(docRef, updatedItem);
  };
  
  const editAndMergeItem = useCallback(async (id: string, updatedItemData: Omit<InventoryItem, 'id'>) => {
    if (!db) return;
    await runTransaction(db, async (transaction) => {
      const originalDocRef = doc(db, 'inventory', id);
  
      const q = query(
        collection(db, 'inventory'),
        where('itemStdCode', '==', updatedItemData.itemStdCode),
        where('itemStatus', '==', updatedItemData.itemStatus),
        where('productName', '==', updatedItemData.productName),
        where('unitPrice', '==', updatedItemData.unitPrice),
        where('vendorName', '==', updatedItemData.vendorName),
        where('purchaseInvoiceNumber', '==', updatedItemData.purchaseInvoiceNumber),
        limit(1)
      );
  
      const querySnapshot = await getDocs(q);
      const mergeTargetDoc = querySnapshot.docs.find(doc => doc.id !== id);
  
      // Delete the original item first
      transaction.delete(originalDocRef);
  
      if (mergeTargetDoc) {
        // If a merge target exists, update its quantity
        const existingData = mergeTargetDoc.data() as InventoryItem;
        const newQuantity = existingData.quantity + updatedItemData.quantity;
        transaction.update(mergeTargetDoc.ref, { quantity: newQuantity });
      } else {
        // Otherwise, create a new item with the full data
        const newDocRef = doc(collection(db, 'inventory'));
        transaction.set(newDocRef, updatedItemData);
      }
    });
  }, [db]);


  const splitItem = useCallback(async (id: string, newStatus: ItemStatus, splitQuantity: number, splitItemData?: { productDetails?: string; salesInvoiceNumber?: string, salesDate?: Date }) => {
    if (!db) return;
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
        
        let salesDateTimestamp: Timestamp | undefined = undefined;
        if (newStatus.includes('Sold') && splitItemData?.salesDate) {
            salesDateTimestamp = Timestamp.fromDate(splitItemData.salesDate);
        } else if (newStatus.includes('Sold')) {
            salesDateTimestamp = serverTimestamp() as Timestamp;
        }

        const newDocPayload: Omit<InventoryItem, 'id'> = {
            ...newItemData,
            quantity: splitQuantity,
            itemStatus: newStatus,
            productDetails: splitItemData?.productDetails ?? newItemData.productDetails,
            salesInvoiceNumber: splitItemData?.salesInvoiceNumber ?? (newStatus.includes('Sold') ? newItemData.salesInvoiceNumber : ''),
            salesDate: salesDateTimestamp,
        };

        // More precise query for merging
        const q = query(
            collection(db, 'inventory'),
            where('itemStdCode', '==', newDocPayload.itemStdCode),
            where('itemStatus', '==', newDocPayload.itemStatus),
            where('productName', '==', newDocPayload.productName),
            where('unitPrice', '==', newDocPayload.unitPrice),
            where('vendorName', '==', newDocPayload.vendorName),
            where('purchaseInvoiceNumber', '==', newDocPayload.purchaseInvoiceNumber),
            where('salesInvoiceNumber', '==', newDocPayload.salesInvoiceNumber || ''),
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
    if (restock) {
      // This is a simplified version. For full restock logic of assembled items,
      // you would need to read the item, determine its components, and add them back.
      // For now, we'll just delete.
    }
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

  const deleteCurrentUser = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("No user is currently signed in.");
    
    await deleteDoc(doc(db, "users", currentUser.uid));
    
    await deleteFirebaseAuthUser(currentUser);
  }, [auth, db]);


  const getItem = useCallback((id: string) => {
      const item = inventory.find((item) => item.id === id);
      if (item) {
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
          purchaseDate: serverTimestamp() as Timestamp,
          imageUrl: '',
          purchasePrice: 0,
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
        purchaseDate: serverTimestamp() as Timestamp,
        imageUrl: '',
        purchasePrice: 0,
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
  
  const addCustomer = async (customer: Omit<Customer, 'id'>, id?: string) => {
    if (id) {
        await updateDoc(doc(db, 'customers', id), customer);
    } else {
        await addDoc(getCollectionRef('customers'), customer);
    }
  };
   const addBatchCustomers = useCallback(async (customers: Omit<Customer, 'id'>[]) => {
      const batch = writeBatch(db);
      customers.forEach(customer => {
        const docRef = doc(getCollectionRef('customers'));
        batch.set(docRef, customer);
      });
      await batch.commit();
  }, [db]);
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
                  salesDate: Timestamp.fromDate(saleData.date),
                  customerId: saleData.customerId,
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
            purchaseDate: item.purchaseDate instanceof Timestamp ? item.purchaseDate : Timestamp.fromDate(new Date(item.purchaseDate as any))
        }))
        for (const item of inventoryWithDates) {
            await addItem(item);
        }
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
      deleteCurrentUser,
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
      addBatchCustomers,
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
      deleteItem, 
      deleteMultipleItems, 
      updateItem, 
      addVehicleModel, 
      updateVehicleModel, 
      assembleVehicle, 
      deleteAssembledVehicle, 
      addBatteryModel, 
      updateBatteryModel, 
      assembleBattery, 
      deleteAssembledBattery, 
      addCustomer,
      addBatchCustomers,
      updateCustomer, 
      deleteCustomer, 
      processSale, 
      clearAllData, 
      restoreAllData,
      deleteCurrentUser
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
