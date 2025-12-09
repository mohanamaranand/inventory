
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
  setDoc,
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
  DocumentReference,
  DocumentData,
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

type AssemblyRequest = 
  | { type: 'vehicle'; data: Omit<AssembledVehicle, 'id' | 'assemblyDate'> }
  | { type: 'battery'; data: Omit<AssembledBattery, 'id' | 'assemblyDate'> };

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
  const { toast } = useToast();

  const [assemblyQueue, setAssemblyQueue] = useState<AssemblyRequest[]>([]);
  const [isProcessingAssembly, setIsProcessingAssembly] = useState(false);
  
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

  const inventory = useMemo(() => (inventoryData || []).map(item => ({ ...item, purchaseDate: item.purchaseDate instanceof Timestamp ? item.purchaseDate.toDate() : item.purchaseDate, salesDate: item.salesDate instanceof Timestamp ? item.salesDate.toDate() : item.salesDate })), [inventoryData]);
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
            salesDate: splitItemData?.salesDate,
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

  const deleteItem = async (id: string, restock: boolean = false) => {
    if (!db) return;
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
  };
  
  const deleteMultipleItems = async (ids: string[], restock: boolean = false) => {
    for (const id of ids) {
        await deleteItem(id, restock);
    }
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

  const assembleVehicle = useCallback(async (vehicleData: Omit<AssembledVehicle, 'id' | 'assemblyDate'>) => {
    setAssemblyQueue((prev) => [...prev, { type: 'vehicle', data: vehicleData }]);
  }, []);

  const deleteAssembledVehicle = async (id: string, restock: boolean = false) => {
    if (!db) return;
  
    try {
      const vehicleRef = doc(db, 'assembledVehicles', id);
      const vehicleSnap = await getDoc(vehicleRef);
      if (!vehicleSnap.exists()) throw new Error("Assembled vehicle not found.");
      const vehicle = vehicleSnap.data() as AssembledVehicle;
  
      const inventoryItemQuery = query(getCollectionRef('inventory'), where('itemStdCode', '==', `ASM-V-${vehicle.chassisNumber}`), limit(1));
      const inventorySnapshot = await getDocs(inventoryItemQuery);
      const inventoryItemRef = !inventorySnapshot.empty ? inventorySnapshot.docs[0].ref : null;
  
      const partOps: { ref: DocumentReference; quantityToAdd: number; isNew?: boolean, data?: Omit<InventoryItem, 'id'> }[] = [];
  
      if (restock) {
        const model = getVehicleModel(vehicle.modelId);
        if (!model?.parts) throw new Error("Vehicle model or parts definition not found for restocking.");
        
        for (const part of model.parts) {
          const partQuery = query(getCollectionRef('inventory'), where('itemStdCode', '==', part.itemStdCode));
          const partSnapshot = await getDocs(partQuery);
          
          if (!partSnapshot.empty) {
            partOps.push({ ref: partSnapshot.docs[0].ref, quantityToAdd: part.quantity });
          } else {
             const newPartRef = doc(collection(db, 'inventory'));
             const newPartData: Omit<InventoryItem, 'id'> = {
                itemStdCode: part.itemStdCode,
                productName: `Restocked - ${part.itemStdCode}`,
                itemCategory: 'Vehicle Part',
                quantity: 0, // Will be updated in transaction
                unitPrice: 0,
                purchasePrice: 0,
                itemStatus: 'In Stock',
                vendorName: 'Restocked',
                purchaseInvoiceNumber: 'RESTOCK',
                storageLocation: 'Default',
                purchaseDate: serverTimestamp() as Timestamp,
                productDetails: '',
             };
             partOps.push({ ref: newPartRef, quantityToAdd: part.quantity, isNew: true, data: newPartData });
          }
        }
      }
  
      await runTransaction(db, async (transaction) => {
        if (restock) {
          for (const op of partOps) {
            if (op.isNew) {
                transaction.set(op.ref, { ...op.data, quantity: op.quantityToAdd });
            } else {
                const partDoc = await transaction.get(op.ref);
                if (partDoc.exists()) {
                    const currentQuantity = partDoc.data().quantity || 0;
                    transaction.update(op.ref, {
                        quantity: currentQuantity + op.quantityToAdd,
                        itemStatus: 'In Stock'
                    });
                }
            }
          }
        }
    
        if (inventoryItemRef) {
          transaction.delete(inventoryItemRef);
        }
        transaction.delete(vehicleRef);
      });
    } catch(error: any) {
        console.error("Failed to delete and restock vehicle:", error);
        toast({
            variant: "destructive",
            title: "Operation Failed",
            description: error.message || "Could not delete the assembled vehicle."
        })
    }
  };
  
  const addBatteryModel = async (model: Omit<BatteryModel, 'id'>) => {
    await addDoc(getCollectionRef('batteryModels'), model);
  };
  const updateBatteryModel = async (id: string, updatedModel: Partial<BatteryModel>) => {
    await updateDoc(doc(db, 'batteryModels', id), updatedModel);
  };
  const getBatteryModel = useCallback((id: string) => batteryModels.find(m => m.id === id), [batteryModels]);
  
  const assembleBattery = useCallback(async (batteryData: Omit<AssembledBattery, 'id' | 'assemblyDate'>) => {
    setAssemblyQueue((prev) => [...prev, { type: 'battery', data: batteryData }]);
  }, []);

  const deleteAssembledBattery = async (id: string, restock: boolean = false) => {
    if (!db) return;

    try {
        const batteryRef = doc(db, 'assembledBatteries', id);
        const batterySnap = await getDoc(batteryRef);
        if (!batterySnap.exists()) throw new Error("Assembled battery not found.");
        const battery = batterySnap.data() as AssembledBattery;

        const inventoryItemQuery = query(getCollectionRef('inventory'), where('itemStdCode', '==', `ASM-B-${battery.serialNumber}`), limit(1));
        const inventorySnapshot = await getDocs(inventoryItemQuery);
        const inventoryItemRef = !inventorySnapshot.empty ? inventorySnapshot.docs[0].ref : null;

        const partOps: { ref: DocumentReference; quantityToAdd: number; isNew?: boolean, data?: Omit<InventoryItem, 'id'> }[] = [];

        if (restock) {
            const model = getBatteryModel(battery.modelId);
            if (!model?.parts) throw new Error("Battery model or parts definition not found for restocking.");

            for (const part of model.parts) {
                const partQuery = query(getCollectionRef('inventory'), where('itemStdCode', '==', part.itemStdCode));
                const partSnapshot = await getDocs(partQuery);
                
                if (!partSnapshot.empty) {
                    partOps.push({ ref: partSnapshot.docs[0].ref, quantityToAdd: part.quantity });
                } else {
                    const newPartRef = doc(collection(db, 'inventory'));
                    const newPartData: Omit<InventoryItem, 'id'> = {
                        itemStdCode: part.itemStdCode,
                        productName: `Restocked - ${part.itemStdCode}`,
                        itemCategory: 'Battery Part',
                        quantity: 0,
                        unitPrice: 0,
                        purchasePrice: 0,
                        itemStatus: 'In Stock',
                        vendorName: 'Restocked',
                        purchaseInvoiceNumber: 'RESTOCK',
                        storageLocation: 'Default',
                        purchaseDate: serverTimestamp() as Timestamp,
                        productDetails: '',
                    };
                    partOps.push({ ref: newPartRef, quantityToAdd: part.quantity, isNew: true, data: newPartData });
                }
            }
        }

        await runTransaction(db, async (transaction) => {
            if (restock) {
                for (const op of partOps) {
                    if (op.isNew) {
                         transaction.set(op.ref, { ...op.data, quantity: op.quantityToAdd });
                    } else {
                        const partDoc = await transaction.get(op.ref);
                        if (partDoc.exists()) {
                            const currentQuantity = partDoc.data().quantity || 0;
                            transaction.update(op.ref, {
                                quantity: currentQuantity + op.quantityToAdd,
                                itemStatus: 'In Stock'
                            });
                        }
                    }
                }
            }

            if (inventoryItemRef) {
                transaction.delete(inventoryItemRef);
            }
            transaction.delete(batteryRef);
        });
    } catch (error: any) {
        console.error("Failed to delete and restock battery:", error);
        toast({
            variant: "destructive",
            title: "Operation Failed",
            description: error.message || "Could not delete the assembled battery."
        });
    }
  };
  
  const addCustomer = async (customer: Omit<Customer, 'id'>, id?: string) => {
    if (!db) return;
    if (id) {
        await updateDoc(doc(db, 'customers', id), customer);
    } else {
        await addDoc(getCollectionRef('customers'), customer);
    }
  };
   const addBatchCustomers = useCallback(async (customers: Omit<Customer, 'id'>[]) => {
      if (!db) return;
      const batch = writeBatch(db);
      customers.forEach(customer => {
        const docRef = doc(getCollectionRef('customers'));
        batch.set(docRef, customer);
      });
      await batch.commit();
  }, [db]);
  const updateCustomer = async (id: string, updatedCustomer: Partial<Customer>) => {
      if (!db) return;
      await updateDoc(doc(db, 'customers', id), updatedCustomer);
  };
  const deleteCustomer = async (id: string) => {
      if (!db) return;
      await deleteDoc(doc(db, 'customers', id));
  };
  const getCustomer = useCallback((id: string) => customers.find(c => c.id === id), [customers]);

  const processSale = async (saleData: SaleData) => {
      if (!db) return;
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
  };

  const restoreAllData = async (data: Partial<AllData>) => {
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
  }

  // Effect to process the assembly queue
  useEffect(() => {
    if (assemblyQueue.length === 0 || isProcessingAssembly || !db) {
      return;
    }

    const processQueue = async () => {
      setIsProcessingAssembly(true);
      const request = assemblyQueue[0];
      
      try {
        const assemblyTimestamp = Timestamp.now();
        await runTransaction(db, async (transaction) => {
            let model: VehicleModel | BatteryModel | undefined;
            
            if (request.type === 'vehicle') {
              model = getVehicleModel(request.data.modelId);
            } else {
              model = getBatteryModel(request.data.modelId);
            }
    
            if (!model) throw new Error("Assembly model not found.");
            const parts = model.parts || [];
    
            const partDocsToUpdate = [];
            for (const part of parts) {
                const itemQuery = query(
                    getCollectionRef('inventory'),
                    where('itemStdCode', '==', part.itemStdCode),
                );
                const snapshot = await getDocs(itemQuery);

                let totalAvailable = 0;
                let docsForPart: { ref: DocumentReference, data: InventoryItem }[] = [];
                snapshot.forEach(docSnap => {
                    const itemData = docSnap.data() as InventoryItem;
                    if (itemData.itemStatus === 'In Stock') {
                       totalAvailable += itemData.quantity;
                       docsForPart.push({ ref: docSnap.ref, data: itemData });
                    }
                });

                if (totalAvailable < part.quantity) {
                    throw new Error(`Insufficient stock for ${part.itemStdCode}. Available: ${totalAvailable}, Required: ${part.quantity}`);
                }

                let required = part.quantity;
                for (const docInfo of docsForPart) {
                    if (required <= 0) break;
                    const take = Math.min(docInfo.data.quantity, required);
                    partDocsToUpdate.push({ ref: docInfo.ref, requiredQuantity: take, currentQuantity: docInfo.data.quantity, unitPrice: docInfo.data.unitPrice });
                    required -= take;
                }
            }

            for (const partDoc of partDocsToUpdate) {
                const newQuantity = partDoc.currentQuantity - partDoc.requiredQuantity;
                const newStatus: ItemStatus = newQuantity > 0 ? 'In Stock' : 'Out of Stock';
                transaction.update(partDoc.ref, { quantity: newQuantity, itemStatus: newStatus });
            }
  
            if (request.type === 'vehicle') {
              const vehicleData = request.data;
              const assembledVehicleRef = doc(collection(db, 'assembledVehicles'));
              transaction.set(assembledVehicleRef, { ...vehicleData, assemblyDate: assemblyTimestamp });
  
              const totalCost = partDocsToUpdate.reduce((sum, partDoc) => {
                return sum + (partDoc.unitPrice * partDoc.requiredQuantity);
              }, 0);
  
              const assembledItem: Omit<InventoryItem, 'id'> = {
                productName: (model as VehicleModel).name,
                productDetails: `Assembled vehicle with Chassis: ${vehicleData.chassisNumber}, Motor: ${vehicleData.motorNumber}`,
                itemStdCode: `ASM-V-${vehicleData.chassisNumber}`,
                itemCategory: 'Assembled Vehicle',
                quantity: 1,
                unitPrice: totalCost,
                itemStatus: 'Assembled',
                purchaseInvoiceNumber: 'ASSEMBLY',
                vendorName: 'In-House',
                storageLocation: 'Finished Goods',
                purchaseDate: assemblyTimestamp,
                imageUrl: '',
                purchasePrice: totalCost,
              };
              const newInventoryItemRef = doc(collection(db, 'inventory'));
              transaction.set(newInventoryItemRef, assembledItem as any);
            } else { // Battery
              const batteryData = request.data;
              const assembledBatteryRef = doc(collection(db, 'assembledBatteries'));
              transaction.set(assembledBatteryRef, { ...batteryData, assemblyDate: assemblyTimestamp });
  
              const totalCost = partDocsToUpdate.reduce((sum, partDoc) => {
                return sum + (partDoc.unitPrice * partDoc.requiredQuantity);
              }, 0);
  
              const assembledItem: Omit<InventoryItem, 'id'> = {
                productName: (model as BatteryModel).name,
                productDetails: `Assembled battery with Serial: ${batteryData.serialNumber}`,
                itemStdCode: `ASM-B-${batteryData.serialNumber}`,
                itemCategory: 'Assembled Battery',
                quantity: 1,
                unitPrice: totalCost,
                itemStatus: 'Assembled',
                purchaseInvoiceNumber: 'ASSEMBLY',
                vendorName: 'In-House',
                storageLocation: 'Finished Goods',
                purchaseDate: assemblyTimestamp,
                imageUrl: '',
                purchasePrice: totalCost,
              };
              const newInventoryItemRef = doc(collection(db, 'inventory'));
              transaction.set(newInventoryItemRef, assembledItem as any);
            }
          });
      } catch (error) {
        console.error("Failed to process assembly request:", error);
      } finally {
        setAssemblyQueue((prev) => prev.slice(1));
        setIsProcessingAssembly(false);
      }
    };

    processQueue();
  }, [assemblyQueue, isProcessingAssembly, db, getVehicleModel, getBatteryModel]);


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
      deleteCurrentUser,
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

    
