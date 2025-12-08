
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
  writeBatch,
  serverTimestamp,
  Timestamp,
  getDocs,
  query,
  limit,
  setDoc,
  deleteDoc,
  getDoc,
  addDoc,
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
  Backup,
} from '@/lib/types';
import { SOLD_STATUSES } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

// Types for local state management
type LocalOperation = 'create' | 'update' | 'delete';
export interface PendingChange {
  type: LocalOperation;
  collection: string;
  id: string;
  payload?: any;
}
interface LocalCache {
  inventory: Map<string, InventoryItem>;
  vehicleModels: Map<string, VehicleModel>;
  assembledVehicles: Map<string, AssembledVehicle>;
  batteryModels: Map<string, BatteryModel>;
  assembledBatteries: Map<string, AssembledBattery>;
  customers: Map<string, Customer>;
  backups: Map<string, Backup>;
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

interface InventoryContextType {
  inventory: InventoryItem[];
  vehicleModels: VehicleModel[];
  assembledVehicles: AssembledVehicle[];
  batteryModels: BatteryModel[];
  assembledBatteries: AssembledBattery[];
  customers: Customer[];
  backups: Backup[];
  loading: boolean;
  pendingChanges: PendingChange[];
  syncChanges: () => Promise<void>;
  addItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
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
  restoreFromBackup: (backupId: string) => Promise<void>;
  deleteBackup: (backupId: string) => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(
  undefined
);

// Helper to convert Date objects to Firestore Timestamps
function convertDatesToTimestamps(data: any): any {
  if (data instanceof Date) {
    return Timestamp.fromDate(data);
  }
  if (Array.isArray(data)) {
    return data.map(item => convertDatesToTimestamps(item));
  }
  if (typeof data === 'object' && data !== null && !(data instanceof Timestamp)) {
    const newData: { [key: string]: any } = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        newData[key] = convertDatesToTimestamps(data[key]);
      }
    }
    return newData;
  }
  return data;
}

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const db = useFirestore();
  const auth = useAuth();
  
  const [cache, setCache] = useState<LocalCache>({
    inventory: new Map(),
    vehicleModels: new Map(),
    assembledVehicles: new Map(),
    batteryModels: new Map(),
    assembledBatteries: new Map(),
    customers: new Map(),
    backups: new Map(),
  });
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Firestore data hooks - use raw data from server
  const inventoryCollection = useMemoFirebase(() => db ? collection(db, 'inventory') : null, [db]);
  const vehicleModelsCollection = useMemoFirebase(() => db ? collection(db, 'vehicleModels') : null, [db]);
  const assembledVehiclesCollection = useMemoFirebase(() => db ? collection(db, 'assembledVehicles') : null, [db]);
  const batteryModelsCollection = useMemoFirebase(() => db ? collection(db, 'batteryModels') : null, [db]);
  const assembledBatteriesCollection = useMemoFirebase(() => db ? collection(db, 'assembledBatteries') : null, [db]);
  const customersCollection = useMemoFirebase(() => db ? collection(db, 'customers') : null, [db]);
  const backupsCollection = useMemoFirebase(() => db ? collection(db, 'backups') : null, [db]);

  const { data: serverInventory, loading: loadingInventory } = useCollection<InventoryItem>(inventoryCollection);
  const { data: serverVehicleModels, loading: loadingVehicleModels } = useCollection<VehicleModel>(vehicleModelsCollection);
  const { data: serverAssembledVehicles, loading: loadingAssembledVehicles } = useCollection<AssembledVehicle>(assembledVehiclesCollection);
  const { data: serverBatteryModels, loading: loadingBatteryModels } = useCollection<BatteryModel>(batteryModelsCollection);
  const { data: serverAssembledBatteries, loading: loadingAssembledBatteries } = useCollection<AssembledBattery>(assembledBatteriesCollection);
  const { data: serverCustomers, loading: loadingCustomers } = useCollection<Customer>(customersCollection);
  const { data: serverBackups, loading: loadingBackups } = useCollection<Backup>(backupsCollection);


  const loading =
    loadingInventory ||
    loadingVehicleModels ||
    loadingAssembledVehicles ||
    loadingBatteryModels ||
    loadingAssembledBatteries ||
    loadingCustomers ||
    loadingBackups;

  // Effect to hydrate local cache ONLY from server data when it loads and there are no pending changes
  useEffect(() => {
    if (!loading && pendingChanges.length === 0) {
      setCache({
        inventory: new Map(serverInventory?.map(item => [item.id, item])),
        vehicleModels: new Map(serverVehicleModels?.map(item => [item.id, item])),
        assembledVehicles: new Map(serverAssembledVehicles?.map(item => [item.id, item])),
        batteryModels: new Map(serverBatteryModels?.map(item => [item.id, item])),
        assembledBatteries: new Map(serverAssembledBatteries?.map(item => [item.id, item])),
        customers: new Map(serverCustomers?.map(item => [item.id, item])),
        backups: new Map(serverBackups?.map(item => [item.id, item])),
      });
    }
  }, [loading, serverInventory, serverVehicleModels, serverAssembledVehicles, serverBatteryModels, serverAssembledBatteries, serverCustomers, serverBackups, pendingChanges.length]);

  const syncChanges = useCallback(async () => {
    if (!db || isSyncing || pendingChanges.length === 0) return;
    setIsSyncing(true);

    const changesToSync = [...pendingChanges];
    
    // Create backup before applying changes
    try {
        const currentDataState: AllData = {
            inventory: Array.from(cache.inventory.values()),
            vehicleModels: Array.from(cache.vehicleModels.values()),
            assembledVehicles: Array.from(cache.assembledVehicles.values()),
            batteryModels: Array.from(cache.batteryModels.values()),
            assembledBatteries: Array.from(cache.assembledBatteries.values()),
            customers: Array.from(cache.customers.values()),
        };
        const backupId = uuidv4();
        const backupRef = doc(db, "backups", backupId);
        await setDoc(backupRef, {
            id: backupId,
            createdAt: serverTimestamp(),
            data: convertDatesToTimestamps(currentDataState),
        });
    } catch (error) {
        console.error("Backup creation failed:", error);
        // Decide if you want to stop the sync if backup fails
    }
    
    const batch = writeBatch(db);

    changesToSync.forEach(change => {
        const { type, collection: collectionName, id, payload } = change;
        const docRef = doc(db, collectionName, id);
        const firestorePayload = convertDatesToTimestamps(payload);

        switch (type) {
            case 'create':
                batch.set(docRef, firestorePayload);
                break;
            case 'update':
                batch.update(docRef, firestorePayload);
                break;
            case 'delete':
                batch.delete(docRef);
                break;
        }
    });

    try {
        await batch.commit();
        setPendingChanges(currentChanges => currentChanges.filter(c => !changesToSync.includes(c)));
    } catch (error) {
        console.error("Sync failed:", error);
    } finally {
        setIsSyncing(false);
    }
  }, [db, pendingChanges, isSyncing, cache]);

  // Memoized values to be exposed by the context
  const inventory = useMemo(() => Array.from(cache.inventory.values()), [cache.inventory]);
  const vehicleModels = useMemo(() => Array.from(cache.vehicleModels.values()), [cache.vehicleModels]);
  const assembledVehicles = useMemo(() => Array.from(cache.assembledVehicles.values()), [cache.assembledVehicles]);
  const batteryModels = useMemo(() => Array.from(cache.batteryModels.values()), [cache.batteryModels]);
  const assembledBatteries = useMemo(() => Array.from(cache.assembledBatteries.values()), [cache.assembledBatteries]);
  const customers = useMemo(() => Array.from(cache.customers.values()), [cache.customers]);
  const backups = useMemo(() => Array.from(cache.backups.values()).sort((a, b) => {
    if (!a.createdAt) return 1;
    if (!b.createdAt) return -1;
    return b.createdAt.toMillis() - a.createdAt.toMillis()
  }), [cache.backups]);


  const addBatchItems = useCallback(async (items: Omit<InventoryItem, 'id' | 'itemStatus'>[]) => {
    setCache(prevCache => {
        const newCache = { ...prevCache, inventory: new Map(prevCache.inventory) };
        const changesToAdd: PendingChange[] = [];

        items.forEach(item => {
            const match = Array.from(newCache.inventory.values()).find(
                (existing) => existing.itemStdCode === item.itemStdCode && existing.itemStatus === 'In Stock'
            );

            if (match) {
                const updatedItem = { ...match, quantity: match.quantity + item.quantity };
                newCache.inventory.set(match.id, updatedItem);
                changesToAdd.push({ type: 'update', collection: 'inventory', id: match.id, payload: { quantity: updatedItem.quantity } });
            } else {
                const id = uuidv4();
                const newItem = { ...item, id, itemStatus: 'In Stock' as const };
                newCache.inventory.set(id, newItem);
                changesToAdd.push({ type: 'create', collection: 'inventory', id, payload: newItem });
            }
        });
        
        setPendingChanges(prev => [...prev, ...changesToAdd]);
        return newCache;
    });
  }, []);

  const addItem = useCallback(async (item: Omit<InventoryItem, 'id'>) => {
    await addBatchItems([item]);
  }, [addBatchItems]);

  const updateItem = useCallback(async (id: string, updatedItem: Partial<Omit<InventoryItem, 'id'>>) => {
    setCache(prevCache => {
      const newCache = { ...prevCache, inventory: new Map(prevCache.inventory) };
      const currentItem = newCache.inventory.get(id);
      if (currentItem) {
        newCache.inventory.set(id, { ...currentItem, ...updatedItem });
        setPendingChanges(prev => [...prev, { type: 'update', collection: 'inventory', id, payload: updatedItem }]);
      }
      return newCache;
    });
  }, []);

  const editAndMergeItem = useCallback(async (id: string, updatedItemData: Omit<InventoryItem, 'id'>) => {
    setCache(prevCache => {
        const newCache = { ...prevCache, inventory: new Map(prevCache.inventory) };
        const newChanges: PendingChange[] = [];

        if (newCache.inventory.has(id)) {
            newCache.inventory.delete(id);
            newChanges.push({ type: 'delete', collection: 'inventory', id });
        }
    
        const match = Array.from(newCache.inventory.values()).find(
            (existing) => existing.itemStdCode === updatedItemData.itemStdCode && existing.itemStatus === updatedItemData.itemStatus
        );
    
        if (match) {
            const mergedItem = { ...match, quantity: match.quantity + updatedItemData.quantity };
            newCache.inventory.set(match.id, mergedItem);
            newChanges.push({ type: 'update', collection: 'inventory', id: match.id, payload: { quantity: mergedItem.quantity } });
        } else {
            const newId = uuidv4();
            const newItem = { ...updatedItemData, id: newId };
            newCache.inventory.set(newId, newItem);
            newChanges.push({ type: 'create', collection: 'inventory', id: newId, payload: newItem });
        }
        setPendingChanges(prev => [...prev, ...newChanges]);
        return newCache;
    });
  }, []);
  

  const splitItem = useCallback(async (id: string, newStatus: ItemStatus, splitQuantity: number, splitItemData?: { productDetails?: string; salesInvoiceNumber?: string; salesDate?: Date }) => {
    setCache(prevCache => {
        const newCache = { ...prevCache, inventory: new Map(prevCache.inventory) };
        const itemToSplit = newCache.inventory.get(id);
        if (!itemToSplit || splitQuantity <= 0 || splitQuantity > itemToSplit.quantity) return prevCache;
        
        const newChanges: PendingChange[] = [];

        const remainingQuantity = itemToSplit.quantity - splitQuantity;
        if (remainingQuantity > 0) {
            const updatedOriginal = { ...itemToSplit, quantity: remainingQuantity };
            newCache.inventory.set(id, updatedOriginal);
            newChanges.push({ type: 'update', collection: 'inventory', id, payload: { quantity: remainingQuantity }});
        } else {
            newCache.inventory.delete(id);
            newChanges.push({ type: 'delete', collection: 'inventory', id });
        }

        const { id: oldId, ...baseData } = itemToSplit;
        const newSplitItem: Omit<InventoryItem, 'id'> = {
            ...baseData,
            quantity: splitQuantity,
            itemStatus: newStatus,
            productDetails: splitItemData?.productDetails ?? baseData.productDetails,
            salesInvoiceNumber: splitItemData?.salesInvoiceNumber ?? (newStatus.includes('Sold') ? baseData.salesInvoiceNumber : ''),
            salesDate: splitItemData?.salesDate ?? (newStatus.includes('Sold') ? new Date() : undefined)
        }

        const newId = uuidv4();
        newCache.inventory.set(newId, { ...newSplitItem, id: newId });
        newChanges.push({ type: 'create', collection: 'inventory', id: newId, payload: newSplitItem });

        setPendingChanges(prev => [...prev, ...newChanges]);
        return newCache;
    });
  }, []);

  const deleteItem = useCallback(async (id: string, restock: boolean = false) => {
    setCache(prevCache => {
      const newCache = { ...prevCache, inventory: new Map(prevCache.inventory) };
      const itemToDelete = newCache.inventory.get(id);
      if (!itemToDelete) return prevCache;
  
      const newChanges: PendingChange[] = [];
  
      newChanges.push({ type: 'delete', collection: 'inventory', id });
      newCache.inventory.delete(id);
  
      if (restock && SOLD_STATUSES.includes(itemToDelete.itemStatus as any)) {
        const { id: originalId, itemStatus, salesDate, salesInvoiceNumber, customerId, ...restoredData } = itemToDelete;
        const restoredItemData = { ...restoredData, itemStatus: 'In Stock' as const, quantity: itemToDelete.quantity };
        
        const match = Array.from(newCache.inventory.values()).find(
          (existing) => existing.itemStdCode === restoredItemData.itemStdCode && existing.itemStatus === 'In Stock'
        );
  
        if (match) {
          const updatedItem = { ...match, quantity: match.quantity + restoredItemData.quantity };
          newCache.inventory.set(match.id, updatedItem);
          newChanges.push({ type: 'update', collection: 'inventory', id: match.id, payload: { quantity: updatedItem.quantity } });
        } else {
          const newId = uuidv4();
          const newItem = { ...restoredItemData, id: newId };
          newCache.inventory.set(newId, newItem);
          newChanges.push({ type: 'create', collection: 'inventory', id: newId, payload: newItem });
        }
      }
      
      setPendingChanges(prev => [...prev, ...newChanges]);
      return newCache;
    });
  }, []);
  

  const deleteMultipleItems = useCallback(async (ids: string[], restock: boolean = false) => {
    setCache(prevCache => {
      const newCache = { ...prevCache, inventory: new Map(prevCache.inventory) };
      const newChanges: PendingChange[] = [];
  
      ids.forEach(id => {
        const itemToDelete = newCache.inventory.get(id);
        if (!itemToDelete) return;
  
        newChanges.push({ type: 'delete', collection: 'inventory', id });
        newCache.inventory.delete(id);
  
        if (restock && SOLD_STATUSES.includes(itemToDelete.itemStatus as any)) {
          const { id: originalId, itemStatus, salesDate, salesInvoiceNumber, customerId, ...restoredData } = itemToDelete;
          const restoredItemData = { ...restoredData, itemStatus: 'In Stock' as const, quantity: itemToDelete.quantity };
          
          const match = Array.from(newCache.inventory.values()).find(
            (existing) => existing.itemStdCode === restoredItemData.itemStdCode && existing.itemStatus === 'In Stock'
          );
  
          if (match) {
            const updatedItem = { ...match, quantity: match.quantity + restoredItemData.quantity };
            newCache.inventory.set(match.id, updatedItem);
            // This is a temporary update, it will be squashed later
            newChanges.push({ type: 'update', collection: 'inventory', id: match.id, payload: { quantity: updatedItem.quantity } });
          } else {
            const newId = uuidv4();
            const newItem = { ...restoredItemData, id: newId };
            newCache.inventory.set(newId, newItem);
            newChanges.push({ type: 'create', collection: 'inventory', id: newId, payload: newItem });
          }
        }
      });
  
      setPendingChanges(prev => [...prev, ...newChanges]);
      return newCache;
    });
  }, []);
  


  const deleteCurrentUser = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("No user is currently signed in.");
    setPendingChanges(prev => [...prev, { type: 'delete', collection: 'users', id: currentUser.uid }]);
    await syncChanges();
    await deleteFirebaseAuthUser(currentUser);
  }, [auth, syncChanges]);

  const getItem = useCallback((id: string) => cache.inventory.get(id), [cache.inventory]);
  const getItemByStdCode = useCallback((stdCode: string) => Array.from(cache.inventory.values()).find(item => item.itemStdCode === stdCode), [cache.inventory]);

  const addVehicleModel = useCallback(async (model: Omit<VehicleModel, 'id'>) => {
    const id = uuidv4();
    const newModel = { ...model, id };
    setCache(prev => ({ ...prev, vehicleModels: new Map(prev.vehicleModels).set(id, newModel) }));
    setPendingChanges(prev => [...prev, { type: 'create', collection: 'vehicleModels', id, payload: newModel }]);
  }, []);

  const updateVehicleModel = useCallback(async (id: string, updatedModel: Partial<VehicleModel>) => {
    setCache(prev => {
        const newCache = { ...prev, vehicleModels: new Map(prev.vehicleModels) };
        const current = newCache.vehicleModels.get(id);
        if (current) {
            newCache.vehicleModels.set(id, { ...current, ...updatedModel });
            setPendingChanges(prevChanges => [...prevChanges, { type: 'update', collection: 'vehicleModels', id, payload: updatedModel }]);
        }
        return newCache;
    });
  }, []);

  const getVehicleModel = useCallback((id: string) => cache.vehicleModels.get(id), [cache.vehicleModels]);

  const assembleVehicle = useCallback(async (vehicleData: Omit<AssembledVehicle, 'id' | 'assemblyDate'>) => {
    const model = getVehicleModel(vehicleData.modelId);
    if (!model || !model.parts) throw new Error("Vehicle model or its parts not found.");

    setCache(prevCache => {
        const newCache = { ...prevCache, inventory: new Map(prevCache.inventory), assembledVehicles: new Map(prevCache.assembledVehicles) };
        const newChanges: PendingChange[] = [];

        // Part deduction
        for (const part of model.parts) {
            const item = Array.from(newCache.inventory.values()).find(i => i.itemStdCode === part.itemStdCode && i.itemStatus === 'In Stock');
            if (!item || item.quantity < part.quantity) {
                throw new Error(`Insufficient stock for part code ${part.itemStdCode}.`);
            }
            const newQuantity = item.quantity - part.quantity;
            if (newQuantity > 0) {
                const updatedItem = { ...item, quantity: newQuantity };
                newCache.inventory.set(item.id, updatedItem);
                newChanges.push({ type: 'update', collection: 'inventory', id: item.id, payload: { quantity: newQuantity }});
            } else {
                newCache.inventory.delete(item.id);
                newChanges.push({ type: 'delete', collection: 'inventory', id: item.id });
            }
        }
        
        // Create assembled vehicle record
        const avId = uuidv4();
        const newAssembledVehicle = { ...vehicleData, id: avId, assemblyDate: new Date() };
        newCache.assembledVehicles.set(avId, newAssembledVehicle);
        newChanges.push({ type: 'create', collection: 'assembledVehicles', id: avId, payload: newAssembledVehicle });
        
        // Create inventory item for the assembled vehicle
        const totalCost = model.parts.reduce((sum, part) => {
            const item = prevCache.inventory.get(Array.from(prevCache.inventory.values()).find(i => i.itemStdCode === part.itemStdCode && i.itemStatus === 'In Stock')?.id || '');
            return sum + (item ? item.unitPrice * part.quantity : 0);
        }, 0);

        const assembledItemId = uuidv4();
        const assembledItem: InventoryItem = {
            id: assembledItemId,
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
            purchaseDate: new Date(),
            imageUrl: '',
            purchasePrice: 0,
        };
        newCache.inventory.set(assembledItemId, assembledItem);
        newChanges.push({ type: 'create', collection: 'inventory', id: assembledItemId, payload: assembledItem });

        setPendingChanges(prev => [...prev, ...newChanges]);
        return newCache;
    });
  }, [getVehicleModel]);
  
  const deleteAssembledVehicle = useCallback(async (id: string, restock: boolean = false) => {
    setCache(prevCache => {
        const newCache = { ...prevCache, inventory: new Map(prevCache.inventory), assembledVehicles: new Map(prevCache.assembledVehicles) };
        const vehicle = newCache.assembledVehicles.get(id);
        if (!vehicle) return prevCache;
        
        const newChanges: PendingChange[] = [];

        newCache.assembledVehicles.delete(id);
        newChanges.push({ type: 'delete', collection: 'assembledVehicles', id });

        const inventoryItem = Array.from(newCache.inventory.values()).find(i => i.itemStdCode === `ASM-V-${vehicle.chassisNumber}`);
        if(inventoryItem) {
            newCache.inventory.delete(inventoryItem.id);
            newChanges.push({ type: 'delete', collection: 'inventory', id: inventoryItem.id });
        }

        if (restock) {
            const model = getVehicleModel(vehicle.modelId);
            if (model?.parts) {
                model.parts.forEach(part => {
                     const item = Array.from(newCache.inventory.values()).find(i => i.itemStdCode === part.itemStdCode && i.itemStatus === 'In Stock');
                     if (item) {
                         const updatedItem = { ...item, quantity: item.quantity + part.quantity };
                         newCache.inventory.set(item.id, updatedItem);
                         newChanges.push({ type: 'update', collection: 'inventory', id: item.id, payload: { quantity: updatedItem.quantity }});
                     }
                });
            }
        }
        
        setPendingChanges(prev => [...prev, ...newChanges]);
        return newCache;
    });
  }, [getVehicleModel]);

  const addBatteryModel = useCallback(async (model: Omit<BatteryModel, 'id'>) => {
    const id = uuidv4();
    const newModel = { ...model, id };
    setCache(prev => ({ ...prev, batteryModels: new Map(prev.batteryModels).set(id, newModel) }));
    setPendingChanges(prev => [...prev, { type: 'create', collection: 'batteryModels', id, payload: newModel }]);
  }, []);

  const updateBatteryModel = useCallback(async (id: string, updatedModel: Partial<BatteryModel>) => {
    setCache(prev => {
        const newCache = { ...prev, batteryModels: new Map(prev.batteryModels) };
        const current = newCache.batteryModels.get(id);
        if (current) {
            newCache.batteryModels.set(id, { ...current, ...updatedModel });
            setPendingChanges(prevChanges => [...prevChanges, { type: 'update', collection: 'batteryModels', id, payload: updatedModel }]);
        }
        return newCache;
    });
  }, []);
  
  const getBatteryModel = useCallback((id: string) => cache.batteryModels.get(id), [cache.batteryModels]);

  const assembleBattery = useCallback(async (batteryData: Omit<AssembledBattery, 'id' | 'assemblyDate'>) => {
    const model = getBatteryModel(batteryData.modelId);
    if (!model || !model.parts) throw new Error("Battery model or its parts not found.");

    setCache(prevCache => {
        const newCache = { ...prevCache, inventory: new Map(prevCache.inventory), assembledBatteries: new Map(prevCache.assembledBatteries) };
        const newChanges: PendingChange[] = [];

        // Part deduction
        for (const part of model.parts) {
            const item = Array.from(newCache.inventory.values()).find(i => i.itemStdCode === part.itemStdCode && i.itemStatus === 'In Stock');
            if (!item || item.quantity < part.quantity) {
                throw new Error(`Insufficient stock for part code ${part.itemStdCode}.`);
            }
            const newQuantity = item.quantity - part.quantity;
            if (newQuantity > 0) {
                const updatedItem = { ...item, quantity: newQuantity };
                newCache.inventory.set(item.id, updatedItem);
                newChanges.push({ type: 'update', collection: 'inventory', id: item.id, payload: { quantity: newQuantity }});
            } else {
                newCache.inventory.delete(item.id);
                newChanges.push({ type: 'delete', collection: 'inventory', id: item.id });
            }
        }
        
        // Create assembled battery record
        const abId = uuidv4();
        const newAssembledBattery = { ...batteryData, id: abId, assemblyDate: new Date() };
        newCache.assembledBatteries.set(abId, newAssembledBattery);
        newChanges.push({ type: 'create', collection: 'assembledBatteries', id: abId, payload: newAssembledBattery });
        
        // Create inventory item for the assembled battery
        const totalCost = model.parts.reduce((sum, part) => {
            const item = prevCache.inventory.get(Array.from(prevCache.inventory.values()).find(i => i.itemStdCode === part.itemStdCode && i.itemStatus === 'In Stock')?.id || '');
            return sum + (item ? item.unitPrice * part.quantity : 0);
        }, 0);

        const assembledItemId = uuidv4();
        const assembledItem: InventoryItem = {
            id: assembledItemId,
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
            purchaseDate: new Date(),
            imageUrl: '',
            purchasePrice: 0,
        };
        newCache.inventory.set(assembledItemId, assembledItem);
        newChanges.push({ type: 'create', collection: 'inventory', id: assembledItemId, payload: assembledItem });

        setPendingChanges(prev => [...prev, ...newChanges]);
        return newCache;
    });
  }, [getBatteryModel]);
  
  const deleteAssembledBattery = useCallback(async (id: string, restock: boolean = false) => {
    setCache(prevCache => {
        const newCache = { ...prevCache, inventory: new Map(prevCache.inventory), assembledBatteries: new Map(prevCache.assembledBatteries) };
        const battery = newCache.assembledBatteries.get(id);
        if (!battery) return prevCache;
        
        const newChanges: PendingChange[] = [];

        newCache.assembledBatteries.delete(id);
        newChanges.push({ type: 'delete', collection: 'assembledBatteries', id });

        const inventoryItem = Array.from(newCache.inventory.values()).find(i => i.itemStdCode === `ASM-B-${battery.serialNumber}`);
        if(inventoryItem) {
            newCache.inventory.delete(inventoryItem.id);
            newChanges.push({ type: 'delete', collection: 'inventory', id: inventoryItem.id });
        }

        if (restock) {
            const model = getBatteryModel(battery.modelId);
            if (model?.parts) {
                model.parts.forEach(part => {
                     const item = Array.from(newCache.inventory.values()).find(i => i.itemStdCode === part.itemStdCode && i.itemStatus === 'In Stock');
                     if (item) {
                         const updatedItem = { ...item, quantity: item.quantity + part.quantity };
                         newCache.inventory.set(item.id, updatedItem);
                         newChanges.push({ type: 'update', collection: 'inventory', id: item.id, payload: { quantity: updatedItem.quantity }});
                     }
                });
            }
        }
        
        setPendingChanges(prev => [...prev, ...newChanges]);
        return newCache;
    });
  }, [getBatteryModel]);

  const addCustomer = useCallback(async (customer: Omit<Customer, 'id'>, id?: string) => {
    setCache(prev => {
        const newCache = { ...prev, customers: new Map(prev.customers) };
        const newId = id || uuidv4();
        const newCustomer = { ...customer, id: newId };
        newCache.customers.set(newId, newCustomer);
        setPendingChanges(prevChanges => [...prevChanges, { type: 'create', collection: 'customers', id: newId, payload: newCustomer }]);
        return newCache;
    });
  }, []);
  
  const addBatchCustomers = useCallback(async (customers: Omit<Customer, 'id'>[]) => {
      setCache(prev => {
        const newCache = { ...prev, customers: new Map(prev.customers) };
        const newChanges: PendingChange[] = [];
        customers.forEach(customer => {
            const newId = uuidv4();
            const newCustomer = { ...customer, id: newId };
            newCache.customers.set(newId, newCustomer);
            newChanges.push({ type: 'create', collection: 'customers', id: newId, payload: newCustomer });
        });
        setPendingChanges(pc => [...pc, ...newChanges]);
        return newCache;
      });
  }, []);

  const updateCustomer = useCallback(async (id: string, updatedCustomer: Partial<Customer>) => {
     setCache(prev => {
        const newCache = { ...prev, customers: new Map(prev.customers) };
        const current = newCache.customers.get(id);
        if (current) {
            newCache.customers.set(id, { ...current, ...updatedCustomer });
            setPendingChanges(prevChanges => [...prevChanges, { type: 'update', collection: 'customers', id, payload: updatedCustomer }]);
        }
        return newCache;
     });
  }, []);

  const deleteCustomer = useCallback(async (id: string) => {
    setCache(prev => {
        const newCache = { ...prev, customers: new Map(prev.customers) };
        if (newCache.customers.has(id)) {
            newCache.customers.delete(id);
            setPendingChanges(prevChanges => [...prevChanges, { type: 'delete', collection: 'customers', id }]);
        }
        return newCache;
    });
  }, []);

  const getCustomer = useCallback((id: string) => cache.customers.get(id), [cache.customers]);

  const processSale = useCallback(async (saleData: SaleData) => {
    setCache(prevCache => {
        const newCache = { ...prevCache, inventory: new Map(prevCache.inventory) };
        const newChanges: PendingChange[] = [];

        saleData.items.forEach(saleItem => {
            const currentItem = newCache.inventory.get(saleItem.itemId);
            if (!currentItem || currentItem.quantity < saleItem.quantity) {
                throw new Error(`Insufficient stock for ${currentItem?.productName}.`);
            }
            
            const saleStatus: ItemStatus = currentItem.itemCategory === 'Assembled Vehicle' || currentItem.itemCategory === 'Assembled Battery' ? 'Sold as vehicle' : 'Sold as Spare';
            
            const soldItemId = uuidv4();
            const { id: originalId, ...itemDataToCopy } = currentItem;
            const soldItem = {
                ...itemDataToCopy,
                id: soldItemId,
                quantity: saleItem.quantity,
                unitPrice: saleItem.unitPrice,
                itemStatus: saleStatus,
                salesInvoiceNumber: saleData.salesInvoiceNumber,
                salesDate: saleData.date,
                customerId: saleData.customerId,
            };
            newCache.inventory.set(soldItemId, soldItem);
            newChanges.push({ type: 'create', collection: 'inventory', id: soldItemId, payload: soldItem });

            const remainingQuantity = currentItem.quantity - saleItem.quantity;
            if (remainingQuantity > 0) {
                const updatedOriginal = { ...currentItem, quantity: remainingQuantity };
                newCache.inventory.set(currentItem.id, updatedOriginal);
                newChanges.push({ type: 'update', collection: 'inventory', id: currentItem.id, payload: { quantity: remainingQuantity }});
            } else {
                newCache.inventory.delete(currentItem.id);
                newChanges.push({ type: 'delete', collection: 'inventory', id: currentItem.id });
            }
        });

        setPendingChanges(prev => [...prev, ...newChanges]);
        return newCache;
    });
  }, []);

  const clearAllData = useCallback(async () => {
    setCache(prevCache => {
        const newChanges: PendingChange[] = [];
        
        const collections: (keyof LocalCache)[] = ['inventory', 'vehicleModels', 'assembledVehicles', 'batteryModels', 'assembledBatteries', 'customers'];
        
        collections.forEach(coll => {
            if (prevCache[coll]) {
                prevCache[coll].forEach((_, id) => {
                    newChanges.push({ type: 'delete', collection: coll, id });
                });
            }
        });
        
        if (prevCache.backups) {
            prevCache.backups.forEach((_, id) => {
                newChanges.push({ type: 'delete', collection: 'backups', id });
            });
        }


        setPendingChanges(prev => [...prev, ...newChanges]);

        return {
            inventory: new Map(),
            vehicleModels: new Map(),
            assembledVehicles: new Map(),
            batteryModels: new Map(),
            assembledBatteries: new Map(),
            customers: new Map(),
            backups: new Map(),
        };
    });
  }, []);

  const restoreAllData = useCallback(async (data: Partial<AllData>) => {
    await clearAllData();

    setCache(() => {
      const newChanges: PendingChange[] = [];
      const newCache: LocalCache = {
        inventory: new Map(),
        vehicleModels: new Map(),
        assembledVehicles: new Map(),
        batteryModels: new Map(),
        assembledBatteries: new Map(),
        customers: new Map(),
        backups: new Map(),
      };

      const processCollection = <T extends { id: string }>(
        collectionName: keyof AllData,
        cacheName: keyof LocalCache
      ) => {
        const items = data[collectionName as keyof AllData] as T[] | undefined;
        if (items) {
          items.forEach(item => {
            const id = item.id || uuidv4();
            const newItem = { ...item, id };
            (newCache[cacheName] as Map<string, T>).set(id, newItem);
            newChanges.push({ type: 'create', collection: cacheName as string, id, payload: newItem });
          });
        }
      };

      processCollection('inventory', 'inventory');
      processCollection('vehicleModels', 'vehicleModels');
      processCollection('assembledVehicles', 'assembledVehicles');
      processCollection('batteryModels', 'batteryModels');
      processCollection('assembledBatteries', 'assembledBatteries');
      processCollection('customers', 'customers');
      
      setPendingChanges(newChanges);
      return newCache;
    });
  }, [clearAllData]);

  const restoreFromBackup = useCallback(async (backupId: string) => {
    if (!db) return;
    const backupDocRef = doc(db, 'backups', backupId);
    const backupDoc = await getDoc(backupDocRef);
    if (!backupDoc.exists()) {
        console.error("Backup not found");
        return;
    }
    const backupData = backupDoc.data()?.data as AllData | undefined;
    if (!backupData) {
        console.error("Backup data is empty or invalid");
        return;
    }
    await restoreAllData(backupData);
  }, [db, restoreAllData]);

  const deleteBackup = useCallback(async (backupId: string) => {
      setCache(prev => {
        const newCache = { ...prev, backups: new Map(prev.backups) };
        if (newCache.backups.has(backupId)) {
          newCache.backups.delete(backupId);
          setPendingChanges(prevChanges => [...prevChanges, { type: 'delete', collection: 'backups', id: backupId }]);
        }
        return newCache;
      });
  }, []);

  const value = useMemo(
    () => ({
      inventory,
      vehicleModels,
      assembledVehicles,
      batteryModels,
      assembledBatteries,
      customers,
      backups,
      loading,
      pendingChanges,
      syncChanges,
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
      restoreAllData,
      restoreFromBackup,
      deleteBackup,
    }),
    [
      inventory,
      vehicleModels,
      assembledVehicles,
      batteryModels,
      assembledBatteries,
      customers,
      backups,
      loading,
      pendingChanges,
      syncChanges,
      getItem,
      getItemByStdCode,
      getVehicleModel,
      getBatteryModel,
      getCustomer,
      addBatchItems,
      splitItem,
      editAndMergeItem,
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
      restoreFromBackup,
      deleteBackup,
      addItem,
      deleteItem,
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

    