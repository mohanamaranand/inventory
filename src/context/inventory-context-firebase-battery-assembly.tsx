
import { Timestamp, collection, doc, runTransaction, getDocs, query, where, DocumentReference, Firestore } from 'firebase/firestore';
import { InventoryItem, BatteryModel, AssembledBattery } from '@/lib/types';

/**
 * Ensures the serial number for a new battery is unique before assembly.
 */
const ensureBatteryUniqueness = async (db: Firestore, serialNumber: string) => {
    const batteriesRef = collection(db, 'assembledBatteries');
    const serialQuery = query(batteriesRef, where('serialNumber', '==', serialNumber));
    const serialSnapshot = await getDocs(serialQuery);
    if (!serialSnapshot.empty) {
        throw new Error(`Serial number "${serialNumber}" already exists.`);
    }
};

/**
 * Creates a new inventory item for an assembled battery within a transaction.
 */
const createAssembledBatteryInventoryItem = (
    transaction: any,
    db: Firestore,
    batteryData: Omit<AssembledBattery, 'id' | 'assemblyDate'>,
    model: BatteryModel,
    totalCost: number,
    assemblyTimestamp: Timestamp
) => {
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
        purchaseDate: assemblyTimestamp.toDate(),
        imageUrl: '',
        purchasePrice: totalCost,
    };
    const newInventoryItemRef = doc(collection(db, 'inventory'));
    transaction.set(newInventoryItemRef, assembledItem as any);
};

/**
 * The core logic for assembling a single battery within a Firestore transaction.
 */
export const processBatteryAssembly = async (
    db: Firestore,
    batteryData: Omit<AssembledBattery, 'id' | 'assemblyDate'>,
    getBatteryModel: (id: string) => BatteryModel | undefined
) => {
    await ensureBatteryUniqueness(db, batteryData.serialNumber);

    await runTransaction(db, async (transaction) => {
        const model = getBatteryModel(batteryData.modelId);
        if (!model) {
            throw new Error("Battery assembly model not found.");
        }

        const parts = model.parts || [];
        let totalCost = 0;

        for (const part of parts) {
            const itemQuery = query(collection(db, 'inventory'), where('itemStdCode', '==', part.itemStdCode), where('itemStatus', '==', 'In Stock'));
            const snapshot = await getDocs(itemQuery);

            let totalAvailable = 0;
            snapshot.forEach(docSnap => {
                totalAvailable += (docSnap.data() as InventoryItem).quantity;
            });

            if (totalAvailable < part.quantity) {
                throw new Error(`Insufficient stock for ${part.itemStdCode}. Available: ${totalAvailable}, Required: ${part.quantity}`);
            }
        }

        for (const part of parts) {
            const itemQuery = query(collection(db, 'inventory'), where('itemStdCode', '==', part.itemStdCode), where('itemStatus', '==', 'In Stock'));
            const snapshot = await getDocs(itemQuery);

            if (snapshot.empty) {
                throw new Error(`No "In Stock" item found for ${part.itemStdCode} during transaction.`);
            }
            
            const itemDoc = snapshot.docs[0];
            const itemData = itemDoc.data() as InventoryItem;

            const newQuantity = itemData.quantity - part.quantity;
            transaction.update(itemDoc.ref, { 
                quantity: newQuantity,
                itemStatus: newQuantity > 0 ? 'In Stock' : 'Out of Stock'
            });

            const price = itemData.purchasePrice ?? itemData.unitPrice ?? 0;
            totalCost += price * part.quantity;
        }

        const assemblyTimestamp = Timestamp.now();
        const assembledBatteryRef = doc(collection(db, 'assembledBatteries'));
        
        const finalBatteryData = { 
            ...batteryData,
            modelName: model.name, // Storing modelName directly
            assemblyDate: assemblyTimestamp 
        };

        transaction.set(assembledBatteryRef, finalBatteryData);

        createAssembledBatteryInventoryItem(transaction, db, batteryData, model, totalCost, assemblyTimestamp);
    });
};
