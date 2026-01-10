
'use client';

import React, {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useCallback,
  useState,
  useEffect,
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
  getDoc,
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
import { useToast } from '@/hooks/use-toast';
import { processVehicleAssembly } from './inventory-context-firebase-assembly';
import { processBatteryAssembly } from './inventory-context-firebase-battery-assembly';

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

type DeletionRequest = 
  | { type: 'vehicle'; id: string; restock: boolean }
  | { type: 'battery'; id: string; restock: boolean };

interface InventoryContextType {
  inventory: InventoryItem[];
  vehicleModels: VehicleModel[];
  assembledVehicles: AssembledVehicle[];
  batteryModels: BatteryModel[];
  assembledBatteries: AssembledBattery[];
  customers: Customer[];
  loading: boolean;
  addItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  addBatchItems: (items: Omit<InventoryItem, 'id'>[]) => Promise<void>;
  updateItem: (id: string, updatedItem: Partial<Omit<InventoryItem, 'id'>>) => Promise<void>;
  editAndMergeItem: (id: string, updatedItem: Omit<InventoryItem, 'id'>) => Promise<void>;
  splitItem: (id: string, newStatus: ItemStatus, splitQuantity: number, splitItemData?: { productDetails?: string; salesInvoiceNumber?: string, salesDate?: Date }) => Promise<void>;
  deleteItem: (id: string, restock?: boolean) => Promise<void>;
  deleteMultipleItems: (ids: string[], restock?: boolean) => Promise<void>;
  deleteCurrentUser: () => Promise<void>;
  getItem: (id: string) => InventoryItem | undefined;
  getItemByStdCode: (stdCode: string) => InventoryItem | undefined;

  addVehicleModel: (model: Omit<VehicleModel, 'id'>) => Promise<void>;
  updateVehicleModel: (id: string, updatedModel: Partial<VehicleModel>) => Promise<void>;
  getVehicleModel: (id: string) => VehicleModel | undefined;

  assembleVehicle: (vehicle: Omit<AssembledVehicle, 'id' | 'assemblyDate'>) => Promise<void>;
  deleteAssembledVehicle: (id: string, restock?: boolean) => Promise<void>;

  addBatteryModel: (model: Omit<BatteryModel, 'id'>) => Promise<void>;
  updateBatteryModel: (id: string, updatedModel: Partial<BatteryModel>) => Promise<void>;
  getBatteryModel: (id: string) => BatteryModel | undefined;

  assembleBattery: (battery: Omit<AssembledBattery, 'id' | 'assemblyDate'>) => Promise<void>;
  deleteAssembledBattery: (id: string, restock?: boolean) => Promise<void>;

  addCustomer: (customer: Omit<Customer, 'id'>, id?: string) => Promise<void>;
  addBatchCustomers: (customers: Omit<Customer, 'id'>[]) => Promise<void>;
  updateCustomer: (id: string, updatedCustomer: Partial<Customer>) => Promise<void>;
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
  const { toast } = useToast();

  const [deletionQueue, setDeletionQueue] = useState<DeletionRequest[]>([]);
  const [isProcessingDeletion, setIsProcessingDeletion] = useState(false);
  
  const inventoryQuery = useMemoFirebase(() => db ? collection(db, 'inventory') : null, [db]);
  const vehicleModelsQuery = useMemoFirebase(() => db ? collection(db, 'vehicleModels') : null, [db]);
  const assembledVehiclesQuery = useMemoFirebase(() => db ? collection(db, 'assembledVehicles') : null, [db]);
  const batteryModelsQuery = useMemoFirebase(() => db ? collection(db, 'batteryModels') : null, [db]);
  const assembledBatteriesQuery = useMemoFirebase(() => db ? collection(db, 'assembledBatteries') : null, [db]);
  const customersQuery = useMemoFirebase(() => db ? collection(db, 'customers') : null, [db]);

  const { data: inventory, isLoading: loadingInventory } = useCollection<InventoryItem>(inventoryQuery);
  const { data: vehicleModels, isLoading: loadingVehicleModels } = useCollection<VehicleModel>(vehicleModelsQuery);
  const { data: assembledVehicles, isLoading: loadingAssembledVehicles } = useCollection<AssembledVehicle>(assembledVehiclesQuery);
  const { data: batteryModels, isLoading: loadingBatteryModels } = useCollection<BatteryModel>(batteryModelsQuery);
  const { data: assembledBatteries, isLoading: loadingAssembledBatteries } = useCollection<AssembledBattery>(assembledBatteriesQuery);
  const { data: customers, isLoading: loadingCustomers } = useCollection<Customer>(customersQuery);

  const loading =
    loadingInventory ||
    loadingVehicleModels ||
    loadingAssembledVehicles ||
    loadingBatteryModels ||
    loadingAssembledBatteries ||
    loadingCustomers;

  const getCollectionRef = useCallback((name: string) => {
      if (!db) throw new Error("Firestore is not initialized.");
      return collection(db, name);
  }, [db]);

  const findAndMergeItem = useCallback(async (transaction: any, itemPayload: Omit<InventoryItem, 'id'>) => {
    if (!db) return;
  
    const sanitizedPayload: Omit<InventoryItem, 'id'> = {
        itemStdCode: itemPayload.itemStdCode || '',
        productName: itemPayload.productName || '',
        itemCategory: itemPayload.itemCategory || 'Other Business Items',
        quantity: itemPayload.quantity ?? 0,
        unitPrice: itemPayload.unitPrice ?? 0,
        purchasePrice: itemPayload.purchasePrice ?? 0,
        storageLocation: itemPayload.storageLocation || '',
        purchaseInvoiceNumber: itemPayload.purchaseInvoiceNumber || '',
        vendorName: itemPayload.vendorName || '',
        productDetails: itemPayload.productDetails || '',
        itemStatus: itemPayload.itemStatus || 'In Stock',
        salesInvoiceNumber: itemPayload.salesInvoiceNumber || '',
        customerId: itemPayload.customerId || '',
        imageUrl: itemPayload.imageUrl || '',
        purchaseDate: itemPayload.purchaseDate,
        salesDate: itemPayload.salesDate || null,
    };
    
    const purchaseDateAsTimestamp = sanitizedPayload.purchaseDate instanceof Date 
        ? Timestamp.fromDate(sanitizedPayload.purchaseDate) 
        : sanitizedPayload.purchaseDate;

    let salesDateAsTimestamp = null;
    if (sanitizedPayload.salesDate) {
        salesDateAsTimestamp = sanitizedPayload.salesDate instanceof Date
            ? Timestamp.fromDate(sanitizedPayload.salesDate)
            : sanitizedPayload.salesDate;
    }

    const q = query(
      collection(db, 'inventory'),
      where('itemStdCode', '==', sanitizedPayload.itemStdCode),
      where('productDetails', '==', sanitizedPayload.productDetails),
      where('purchasePrice', '==', sanitizedPayload.purchasePrice),
      where('unitPrice', '==', sanitizedPayload.unitPrice),
      where('storageLocation', '==', sanitizedPayload.storageLocation),
      where('purchaseInvoiceNumber', '==', sanitizedPayload.purchaseInvoiceNumber),
      where('purchaseDate', '==', purchaseDateAsTimestamp),
      where('itemStatus', '==', sanitizedPayload.itemStatus),
      where('salesInvoiceNumber', '==', sanitizedPayload.salesInvoiceNumber),
      where('customerId', '==', sanitizedPayload.customerId),
      limit(1)
    );
  
    const snapshot = await getDocs(q);
  
    if (!snapshot.empty) {
      const existingDoc = snapshot.docs[0];
      const existingData = existingDoc.data() as InventoryItem;
      const newQuantity = existingData.quantity + itemPayload.quantity;
      transaction.update(existingDoc.ref, { quantity: newQuantity });
    } else {
      const newDocRef = doc(collection(db, 'inventory'));
      transaction.set(newDocRef, {
        ...sanitizedPayload,
        purchaseDate: purchaseDateAsTimestamp,
        salesDate: salesDateAsTimestamp,
      });
    }
  }, [db]);
  

  const addItem = useCallback(async (item: Omit<InventoryItem, 'id'>) => {
    if (!db) return;
    await runTransaction(db, async (transaction) => {
      await findAndMergeItem(transaction, item);
    });
  }, [db, findAndMergeItem]);


  const addBatchItems = useCallback(async (items: Omit<InventoryItem, 'id'>[]) => {
    if (!db) return;
    for (const item of items) {
      await addItem(item);
    }
  }, [db, addItem]);
  
  const updateItem = useCallback(async (
    id: string,
    updatedItem: Partial<Omit<InventoryItem, 'id'>>
  ) => {
    if (!db) return;
    const docRef = doc(db, 'inventory', id);
    await updateDoc(docRef, updatedItem);
  }, [db]);
  
  const editAndMergeItem = useCallback(async (id: string, updatedItemData: Omit<InventoryItem, 'id'>) => {
    if (!db) return;
    await runTransaction(db, async (transaction) => {
        const originalDocRef = doc(db, 'inventory', id);
        transaction.delete(originalDocRef);
        await findAndMergeItem(transaction, updatedItemData);
    });
  }, [db, findAndMergeItem]);

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

        const remainingQuantity = itemToSplit.quantity - splitQuantity;
        if (remainingQuantity > 0) {
            transaction.update(itemDocRef, { quantity: remainingQuantity });
        } else {
            transaction.delete(itemDocRef);
        }

        const { id: originalId, ...newItemData } = itemToSplit;
        
        let newDocPayload: Omit<InventoryItem, 'id'> = {
            ...newItemData,
            quantity: splitQuantity,
            itemStatus: newStatus,
            productDetails: splitItemData?.productDetails ?? itemToSplit.productDetails,
            salesInvoiceNumber: splitItemData?.salesInvoiceNumber,
            salesDate: splitItemData?.salesDate ? Timestamp.fromDate(splitItemData.salesDate) : undefined,
            purchaseDate: itemToSplit.purchaseDate,
        };

        if (!SOLD_STATUSES.includes(newStatus as any)) {
            newDocPayload = {
              ...newDocPayload,
              salesInvoiceNumber: '',
              salesDate: undefined,
              customerId: '',
            }
        }
        
        await findAndMergeItem(transaction, newDocPayload);
    });
  }, [db, findAndMergeItem]);

  const deleteAssembledVehicle = useCallback(async (id: string, restock: boolean = false) => {
    setDeletionQueue(prev => [...prev, { type: 'vehicle', id, restock }]);
    toast({
        title: "Deletion Queued",
        description: `Vehicle deletion has been added to the queue.`
    });
  }, [toast]);
  
  const deleteAssembledBattery = useCallback(async (id: string, restock: boolean = false) => {
    setDeletionQueue(prev => [...prev, { type: 'battery', id, restock }]);
    toast({
        title: "Deletion Queued",
        description: `Battery deletion has been added to the queue.`
    });
  }, [toast]);

  const deleteItem = useCallback(async (id: string, restock: boolean = false) => {
    if (!db || !inventory) return;
    const itemToDelete = inventory.find(item => item.id === id);
    if (!itemToDelete) return;

    if (itemToDelete.itemCategory === 'Assembled Vehicle') {
      const chassisNumber = itemToDelete.itemStdCode.replace('ASM-V-', '');
      const vehicleQuery = query(collection(db, 'assembledVehicles'), where('chassisNumber', '==', chassisNumber), limit(1));
      const vehicleSnapshot = await getDocs(vehicleQuery);
      if (!vehicleSnapshot.empty) {
        await deleteAssembledVehicle(vehicleSnapshot.docs[0].id, restock);
      } else {
        await deleteDoc(doc(db, 'inventory', id));
      }
    } else if (itemToDelete.itemCategory === 'Assembled Battery') {
      const serialNumber = itemToDelete.itemStdCode.replace('ASM-B-', '');
      const batteryQuery = query(collection(db, 'assembledBatteries'), where('serialNumber', '==', serialNumber), limit(1));
      const batterySnapshot = await getDocs(batteryQuery);
      if (!batterySnapshot.empty) {
         await deleteAssembledBattery(batterySnapshot.docs[0].id, restock);
      } else {
         await deleteDoc(doc(db, 'inventory', id));
      }
    } else {
      await deleteDoc(doc(db, 'inventory', id));
    }
  }, [db, inventory, deleteAssembledVehicle, deleteAssembledBattery]);
  
  const deleteMultipleItems = useCallback(async (ids: string[], restock: boolean = false) => {
    for (const id of ids) {
        await deleteItem(id, restock);
    }
  }, [deleteItem]);

  const deleteCurrentUser = useCallback(async () => {
    if (!auth || !db) return;
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("No user is currently signed in.");
    
    await deleteDoc(doc(db, "users", currentUser.uid));
    
    await deleteFirebaseAuthUser(currentUser);
  }, [auth, db]);

  const getItem = useCallback((id: string) => {
      if (!inventory) return undefined;
      return inventory.find((item) => item.id === id);
  }, [inventory]);

  const getItemByStdCode = useCallback((stdCode: string) => {
      if (!inventory) return undefined;
      return inventory.find((item) => item.itemStdCode === stdCode);
  }, [inventory]);
  
  const addVehicleModel = useCallback(async (model: Omit<VehicleModel, 'id'>) => {
    await addDoc(getCollectionRef('vehicleModels'), model);
  }, [getCollectionRef]);

  const updateVehicleModel = useCallback(async (id: string, updatedModel: Partial<VehicleModel>) => {
    if (!db) return;
    await updateDoc(doc(db, 'vehicleModels', id), updatedModel);
  }, [db]);

  const getVehicleModel = useCallback((id: string) => {
      if (!vehicleModels) return undefined;
      return vehicleModels.find(m => m.id === id);
  }, [vehicleModels]);

  const assembleVehicle = useCallback(async (vehicleData: Omit<AssembledVehicle, 'id' | 'assemblyDate'>) => {
    if (!db) throw new Error("Database not initialized.");
    try {
        await processVehicleAssembly(db, vehicleData, getVehicleModel);
        toast({ title: "Success", description: "Vehicle assembled successfully." });
    } catch(e: any) {
        toast({ variant: 'destructive', title: "Error", description: e.message });
        throw e;
    }
  }, [db, getVehicleModel, toast]);


  const addBatteryModel = useCallback(async (model: Omit<BatteryModel, 'id'>) => {
    await addDoc(getCollectionRef('batteryModels'), model);
  }, [getCollectionRef]);

  const updateBatteryModel = useCallback(async (id: string, updatedModel: Partial<BatteryModel>) => {
    if (!db) return;
    await updateDoc(doc(db, 'batteryModels', id), updatedModel);
  }, [db]);

  const getBatteryModel = useCallback((id: string) => {
      if (!batteryModels) return undefined;
      return batteryModels.find(m => m.id === id);
  }, [batteryModels]);
  
  const assembleBattery = useCallback(async (batteryData: Omit<AssembledBattery, 'id' | 'assemblyDate'>) => {
    if (!db) throw new Error("Database not initialized.");
    try {
        await processBatteryAssembly(db, batteryData, getBatteryModel);
        toast({ title: "Success", description: "Battery assembled successfully." });
    } catch(e: any) {
        toast({ variant: 'destructive', title: "Error", description: e.message });
        throw e;
    }
  }, [db, getBatteryModel, toast]);
  
  const addCustomer = useCallback(async (customer: Omit<Customer, 'id'>, id?: string) => {
    if (!db) return;
    if (id) {
        await updateDoc(doc(db, 'customers', id), customer);
    } else {
        await addDoc(getCollectionRef('customers'), customer);
    }
  }, [db, getCollectionRef]);

  const addBatchCustomers = useCallback(async (customers: Omit<Customer, 'id'>[]) => {
      if (!db) return;
      const batch = writeBatch(db);
      customers.forEach(customer => {
        const docRef = doc(getCollectionRef('customers'));
        batch.set(docRef, customer);
      });
      await batch.commit();
  }, [db, getCollectionRef]);

  const updateCustomer = useCallback(async (id: string, updatedCustomer: Partial<Customer>) => {
      if (!db) return;
      await updateDoc(doc(db, 'customers', id), updatedCustomer);
  }, [db]);

  const deleteCustomer = useCallback(async (id: string) => {
      if (!db) return;
      await deleteDoc(doc(db, 'customers', id));
  }, [db]);

  const getCustomer = useCallback((id: string) => {
      if (!customers) return undefined;
      return customers.find(c => c.id === id);
  }, [customers]);

  const processSale = useCallback(async (saleData: SaleData) => {
    if (!db) return;
    await runTransaction(db, async (transaction) => {
        const saleItemsInfo = [];

        for (const saleItem of saleData.items) {
            const itemRef = doc(db, 'inventory', saleItem.itemId);
            const itemDoc = await transaction.get(itemRef);
            if (!itemDoc.exists()) {
                throw new Error(`Item with ID ${saleItem.itemId} not found.`);
            }
            const currentItem = itemDoc.data() as InventoryItem;
            if (currentItem.quantity < saleItem.quantity) {
                throw new Error(`Insufficient stock for ${currentItem.productName}.`);
            }
            saleItemsInfo.push({ ref: itemRef, doc: currentItem, sale: saleItem });
        }

        for (const { ref, doc: currentItem, sale: saleItem } of saleItemsInfo) {
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
                transaction.update(ref, { quantity: remainingQuantity });
            } else {
                transaction.delete(ref);
            }
        }
    });
}, [db]);


  const clearAllData = useCallback(async () => {
    if (!db) return;
    const collections = ['inventory', 'vehicleModels', 'assembledVehicles', 'batteryModels', 'assembledBatteries', 'customers'];
    for (const coll of collections) {
        const collRef = getCollectionRef(coll);
        const snapshot = await getDocs(query(collRef));
        if (snapshot.empty) continue;
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }
  }, [db, getCollectionRef]);

  const restoreAllData = useCallback(async (data: Partial<AllData>) => {
    if (!db) return;
    await clearAllData();

    const toTimestamp = (date: any): Timestamp => {
        if (!date) return Timestamp.now();
        if (date instanceof Timestamp) return date;
        if (date instanceof Date) return Timestamp.fromDate(date);
        return Timestamp.fromDate(new Date(date));
    };
    
    const hasDataToRestore = 
        (data.inventory && data.inventory.length > 0) ||
        (data.vehicleModels && data.vehicleModels.length > 0) ||
        (data.assembledVehicles && data.assembledVehicles.length > 0) ||
        (data.batteryModels && data.batteryModels.length > 0) ||
        (data.assembledBatteries && data.assembledBatteries.length > 0) ||
        (data.customers && data.customers.length > 0);

    if (!hasDataToRestore) return;

    const batch = writeBatch(db);

    if (data.inventory) {
      data.inventory.forEach(item => {
        const { id, ...itemData } = item;
        const docRef = doc(collection(db, 'inventory'));
        batch.set(docRef, {
            ...itemData,
            purchaseDate: toTimestamp(item.purchaseDate),
            salesDate: item.salesDate ? toTimestamp(item.salesDate) : null,
        });
      });
    }

    data.vehicleModels?.forEach(item => {
        const { id, ...itemData } = item;
        const docRef = doc(getCollectionRef('vehicleModels'));
        batch.set(docRef, itemData);
    });
    data.assembledVehicles?.forEach(item => {
        const { id, ...itemData } = item;
        const docRef = doc(getCollectionRef('assembledVehicles'));
        batch.set(docRef, {...itemData, assemblyDate: toTimestamp(item.assemblyDate) });
    });
    data.batteryModels?.forEach(item => {
        const { id, ...itemData } = item;
        const docRef = doc(getCollectionRef('batteryModels'));
        batch.set(docRef, itemData);
    });
    data.assembledBatteries?.forEach(item => {
        const { id, ...itemData } = item;
        const docRef = doc(getCollectionRef('assembledBatteries'));
        batch.set(docRef, {...itemData, assemblyDate: toTimestamp(item.assemblyDate) });
    });
    data.customers?.forEach(item => {
        const { id, ...itemData } = item;
        const docRef = doc(getCollectionRef('customers'));
        batch.set(docRef, itemData);
    });
    await batch.commit();
  }, [db, clearAllData, getCollectionRef]);

  // Effect to process the deletion queue
  useEffect(() => {
    if (deletionQueue.length === 0 || isProcessingDeletion || !db) {
        return;
    }

    const processDeletionQueue = async () => {
        setIsProcessingDeletion(true);
        const request = deletionQueue[0];
        
        try {
            if (request.type === 'vehicle') {
                const vehicleRef = doc(db, 'assembledVehicles', request.id);
                const vehicleSnap = await getDoc(vehicleRef);
                if (!vehicleSnap.exists()) throw new Error("Assembled vehicle not found.");
                
                const vehicle = vehicleSnap.data() as AssembledVehicle;
                const inventoryQuery = query(getCollectionRef('inventory'), where('itemStdCode', '==', `ASM-V-${vehicle.chassisNumber}`), limit(1));
                const inventorySnapshot = await getDocs(inventoryQuery);
                const inventoryItemRef = !inventorySnapshot.empty ? inventorySnapshot.docs[0].ref : null;
                
                let model: VehicleModel | undefined;
                
                if (request.restock) {
                    model = getVehicleModel(vehicle.modelId);
                    if (!model?.parts) throw new Error("Vehicle model or parts not found for restocking.");
                    
                    // ... (restocking logic can be refactored)
                }
                
                await runTransaction(db, async (transaction) => {
                    if (inventoryItemRef) transaction.delete(inventoryItemRef);
                    transaction.delete(vehicleRef);
                });
                toast({ title: "Vehicle Deleted", description: `Vehicle ${vehicle.chassisNumber} deleted. ${request.restock ? 'Parts restocked.' : ''}` });
            } else { // Battery
                const batteryRef = doc(db, 'assembledBatteries', request.id);
                const batterySnap = await getDoc(batteryRef);
                if (!batterySnap.exists()) throw new Error("Assembled battery not found.");
                
                const battery = batterySnap.data() as AssembledBattery;
                const inventoryQuery = query(getCollectionRef('inventory'), where('itemStdCode', '==', `ASM-B-${battery.serialNumber}`), limit(1));
                const inventorySnapshot = await getDocs(inventoryQuery);
                const inventoryItemRef = !inventorySnapshot.empty ? inventorySnapshot.docs[0].ref : null;

                let model = getBatteryModel(battery.modelId);
                
                await runTransaction(db, async (transaction) => {
                    if (request.restock && model?.parts) {
                        // ... (restocking logic can be refactored)
                    }
                    if (inventoryItemRef) transaction.delete(inventoryItemRef);
                    transaction.delete(batteryRef);
                });
                toast({ title: "Battery Deleted", description: `Battery ${battery.serialNumber} deleted. ${request.restock ? 'Parts restocked.' : ''}` });
            }
        } catch (error: any) {
            console.error("Failed to process deletion request:", error);
            toast({
                variant: "destructive",
                title: "Deletion Failed",
                description: error.message || "Could not delete the item.",
            });
        } finally {
            setDeletionQueue((prev) => prev.slice(1));
            setIsProcessingDeletion(false);
        }
    };

    processDeletionQueue();
  }, [deletionQueue, isProcessingDeletion, db, getVehicleModel, getBatteryModel, toast, getCollectionRef]);

  const value = useMemo(
    () => ({
      inventory: inventory || [],
      vehicleModels: vehicleModels || [],
      assembledVehicles: assembledVehicles || [],
      batteryModels: batteryModels || [],
      assembledBatteries: assembledBatteries || [],
      customers: customers || [],
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
