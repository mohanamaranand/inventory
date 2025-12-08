
"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { useInventory } from "@/context/inventory-context-firebase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, Trash2 } from "lucide-react";
import type { AssembledBattery, AssembledVehicle, BatteryModel, Customer, InventoryItem, VehicleModel, AllData } from "@/lib/types";
import { Timestamp } from "firebase/firestore";

export function DataManagement() {
  const {
    inventory,
    vehicleModels,
    assembledVehicles,
    batteryModels,
    assembledBatteries,
    customers,
    clearAllData,
    restoreAllData,
  } = useInventory();
  const { toast } = useToast();
  const [isRestoreAlertOpen, setRestoreAlertOpen] = useState(false);
  const [backupFile, setBackupFile] = useState<File | null>(null);

  const toDateOrString = (date: any) => {
    if (date instanceof Timestamp) return date.toDate();
    if (date instanceof Date) return date;
    return date;
  }

  const handleDownload = () => {
    const inventorySheet = XLSX.utils.json_to_sheet(inventory.map(item => ({
        ...item,
        purchaseDate: toDateOrString(item.purchaseDate),
        salesDate: item.salesDate ? toDateOrString(item.salesDate) : undefined,
    })));
    const vehicleModelsSheet = XLSX.utils.json_to_sheet(vehicleModels.map(vm => ({ ...vm, parts: JSON.stringify(vm.parts) })));
    const assembledVehiclesSheet = XLSX.utils.json_to_sheet(assembledVehicles.map(v => ({...v, assemblyDate: toDateOrString(v.assemblyDate)})));
    const batteryModelsSheet = XLSX.utils.json_to_sheet(batteryModels.map(bm => ({...bm, parts: JSON.stringify(bm.parts) })));
    const assembledBatteriesSheet = XLSX.utils.json_to_sheet(assembledBatteries.map(b => ({...b, assemblyDate: toDateOrString(b.assemblyDate)})));
    const customersSheet = XLSX.utils.json_to_sheet(customers);


    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, inventorySheet, "Inventory");
    XLSX.utils.book_append_sheet(workbook, vehicleModelsSheet, "Vehicle Models");
    XLSX.utils.book_append_sheet(workbook, assembledVehiclesSheet, "Assembled Vehicles");
    XLSX.utils.book_append_sheet(workbook, batteryModelsSheet, "Battery Models");
    XLSX.utils.book_append_sheet(workbook, assembledBatteriesSheet, "Assembled Batteries");
    XLSX.utils.book_append_sheet(workbook, customersSheet, "Customers");


    const today = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `stockpilot_backup_${today}.xlsx`);

    toast({
      title: "Backup Downloaded",
      description: "Your data has been successfully exported to an Excel file.",
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBackupFile(file);
      setRestoreAlertOpen(true);
    }
  };

  const handleRestore = () => {
    if (!backupFile) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });

        const restoredInventory: InventoryItem[] = workbook.Sheets["Inventory"] ? XLSX.utils.sheet_to_json(workbook.Sheets["Inventory"]) : [];
        const restoredVehicleModels: VehicleModel[] = workbook.Sheets["Vehicle Models"] ? XLSX.utils.sheet_to_json(workbook.Sheets["Vehicle Models"]) : [];
        const restoredAssembledVehicles: AssembledVehicle[] = workbook.Sheets["Assembled Vehicles"] ? XLSX.utils.sheet_to_json(workbook.Sheets["Assembled Vehicles"]) : [];
        const restoredBatteryModels: BatteryModel[] = workbook.Sheets["Battery Models"] ? XLSX.utils.sheet_to_json(workbook.Sheets["Battery Models"]) : [];
        const restoredAssembledBatteries: AssembledBattery[] = workbook.Sheets["Assembled Batteries"] ? XLSX.utils.sheet_to_json(workbook.Sheets["Assembled Batteries"]) : [];
        const restoredCustomers: Customer[] = workbook.Sheets["Customers"] ? XLSX.utils.sheet_to_json(workbook.Sheets["Customers"]) : [];

        await restoreAllData({
            inventory: restoredInventory,
            vehicleModels: restoredVehicleModels.map(vm => ({ ...vm, parts: typeof vm.parts === 'string' ? JSON.parse(vm.parts) : vm.parts })),
            assembledVehicles: restoredAssembledVehicles,
            batteryModels: restoredBatteryModels.map(bm => ({ ...bm, parts: typeof bm.parts === 'string' ? JSON.parse(bm.parts) : bm.parts })),
            assembledBatteries: restoredAssembledBatteries,
            customers: restoredCustomers
        });

        toast({
          title: "Restore Successful",
          description: "All data has been restored from the backup file.",
        });

      } catch (error: any) {
        console.error("Error restoring from backup:", error);
        toast({
          variant: "destructive",
          title: "Restore Failed",
          description: error.message || "There was an error processing the backup file. Ensure parts columns are valid JSON.",
        });
      } finally {
        setBackupFile(null);
        setRestoreAlertOpen(false);
        if(document.getElementById('restore-input')){
            (document.getElementById('restore-input') as HTMLInputElement).value = "";
        }
      }
    };
    reader.readAsArrayBuffer(backupFile);
  };

  const handleClearData = () => {
    clearAllData();
    toast({
      variant: "destructive",
      title: "All Data Cleared",
      description: "The application has been reset to its initial state.",
    });
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Backup & Restore</CardTitle>
          <CardDescription>
            Download your current data as an Excel file for offline backup, or restore
            the application state from a previously downloaded file.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <Button onClick={handleDownload} variant="outline" size="lg">
            <Download className="mr-2 h-4 w-4" />
            Download Full Backup
          </Button>
          <Button onClick={() => document.getElementById('restore-input')?.click()} variant="outline" size="lg">
            <Upload className="mr-2 h-4 w-4" />
            Restore from Backup
          </Button>
            <input
                id="restore-input"
                type="file"
                className="hidden"
                accept=".xlsx"
                onChange={handleFileChange}
            />
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            This action is irreversible. Please proceed with caution.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All Application Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all data including inventory, models, and customers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={handleClearData}
                >
                  Yes, delete all data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>

        <AlertDialog open={isRestoreAlertOpen} onOpenChange={setRestoreAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Restore from Backup?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will replace all current data with the data from the selected backup file. This action cannot be undone. Are you sure you want to continue?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setBackupFile(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRestore}>
                        Yes, Restore Data
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
