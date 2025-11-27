export const ITEM_CATEGORIES = [
  'Vehicle Part',
  'Spare',
  'Accessories',
  'Tools',
  'Machinery',
  'Battery Part',
  'Solar Material',
  'Assembled Vehicle',
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

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export interface InventoryItem {
  id: string; // S.No
  purchaseInvoiceNumber: string;
  vendorName: string;
  date: Date;
  itemStdCode: string;
  itemCategory: ItemCategory;
  productName: string;
  productDetails: string;
  quantity: number;
  storageLocation: string;
  unitPrice: number;
  itemStatus: ItemStatus;
  salesInvoiceNumber?: string;
  salesData?: { date: string; quantitySold: number }[];
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
  assemblyDate: Date;
}
