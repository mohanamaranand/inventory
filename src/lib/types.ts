
import { Timestamp } from 'firebase/firestore';

export const ITEM_CATEGORIES = [
  'Vehicle Part',
  'Battery Part',
  'Spare',
  'Accessories',
  'Tools',
  'Machinery',
  'Solar Part',
  'Electrical Part',
  'Showroom Part',
  'Solar Material',
  'Assembled Vehicle',
  'Assembled Battery',
  'Non Business Items',
  'Other Business Items',
] as const;

export const ITEM_STATUSES = [
  'In Stock',
  'Out of Stock',
  'Assembled',
  'Sold as Spare',
  'Sold as vehicle',
  'Damaged',
  'Own use',
  'Missing',
  'Fault',
  'Returned',
] as const;

export const SOLD_STATUSES = ['Sold as Spare', 'Sold as vehicle'] as const;

export const OTHER_STATUSES = ['Damaged', 'Own use', 'Missing', 'Fault', 'Returned'] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export interface InventoryItem {
  id: string; // This will be the document ID from Firestore
  purchaseInvoiceNumber: string;
  vendorName: string;
  purchaseDate: Timestamp | Date;
  itemStdCode: string;
  itemCategory: ItemCategory;
  productName: string;
  productDetails: string;
  quantity: number;
  storageLocation: string;
  unitPrice: number;
  purchasePrice: number;
  itemStatus: ItemStatus;
  salesInvoiceNumber?: string;
  salesDate?: Timestamp | Date;
  customerId?: string;
  imageUrl?: string;
}

export interface VehiclePart {
  itemStdCode: string;
  quantity: number;
}

export interface VehicleModel {
  id: string;
  name: string;
  parts: VehiclePart[];
}

export interface AssembledVehicle {
  id: string;
  modelId: string;
  chassisNumber: string;
  motorNumber: string;
  assemblyDate: Timestamp | Date;
}

export interface BatteryPart {
    itemStdCode: string;
    quantity: number;
}

export interface BatteryModel {
    id: string;
    name: string;
    parts: BatteryPart[];
}

export interface AssembledBattery {
    id: string;
    modelId: string;
    serialNumber: string;
    assemblyDate: Timestamp | Date;
}

export interface Customer {
    id: string;
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
}

export type UserRole = 'owner' | 'administrator' | 'employee' | null;

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
}

export interface AllData {
    inventory: InventoryItem[];
    vehicleModels: VehicleModel[];
    assembledVehicles: AssembledVehicle[];
    batteryModels: BatteryModel[];
    assembledBatteries: AssembledBattery[];
    customers: Customer[];
  }
  
  export interface Backup {
    id: string;
    createdAt: Timestamp;
    data: AllData;
  }
  

    