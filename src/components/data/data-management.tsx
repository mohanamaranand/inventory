
"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { useInventory } from "@/context/inventory-context-firebase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Download, Upload, Trash2, AlertTriangle, UserX } from "lucide-react";
import type { AssembledBattery, AssembledVehicle, BatteryModel, Customer, InventoryItem, VehicleModel } from "@/lib/types";
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
    deleteCurrentUser,
  } = useInventory();
  const { toast } = useToast();
  const [isRestoreAlertOpen, setRestoreAlertOpen] = useState(false);
  const [backupFile, setBackupFile] = useState<File | null>(null);


  const handleDownload = () => {
    const toDateString = (date: any) => {
        if (!date) return '';
        if (date instanceof Timestamp) return date.toDate().toISOString().split('T')[0];
        if (date instanceof Date) return date.toISOString().split('T')[0];
        return String(date);
    }
    
    const inventorySheet = XLSX.utils.json_to_sheet(inventory.map(item => ({
        ...item,
        date: toDateString(item.date),
    })));
    const vehicleModelsSheet = XLSX.utils.json_to_sheet(vehicleModels.map(vm => ({ ...vm, parts: JSON.stringify(vm.parts) })));
    const assembledVehiclesSheet = XLSX.utils.json_to_sheet(assembledVehicles.map(v => ({
        ...v,
        assemblyDate: toDateString(v.assemblyDate),
    })));
    const batteryModelsSheet = XLSX.utils.json_to_sheet(batteryModels.map(bm => ({...bm, parts: JSON.stringify(bm.parts) })));
    const assembledBatteriesSheet = XLSX.utils.json_to_sheet(assembledBatteries.map(b => ({
        ...b,
        assemblyDate: toDateString(b.assemblyDate),
    })));
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
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });

        const inventorySheet = workbook.Sheets["Inventory"];
        const vehicleModelsSheet = workbook.Sheets["Vehicle Models"];
        const assembledVehiclesSheet = workbook.Sheets["Assembled Vehicles"];
        const batteryModelsSheet = workbook.Sheets["Battery Models"];
        const assembledBatteriesSheet = workbook.Sheets["Assembled Batteries"];
        const customersSheet = workbook.Sheets["Customers"];

        const restoredInventory: InventoryItem[] = inventorySheet ? XLSX.utils.sheet_to_json(inventorySheet) : [];
        const restoredVehicleModels: VehicleModel[] = vehicleModelsSheet ? XLSX.utils.sheet_to_json(vehicleModelsSheet) : [];
        const restoredAssembledVehicles: AssembledVehicle[] = assembledVehiclesSheet ? XLSX.utils.sheet_to_json(assembledVehiclesSheet) : [];
        const restoredBatteryModels: BatteryModel[] = batteryModelsSheet ? XLSX.utils.sheet_to_json(batteryModelsSheet) : [];
        const restoredAssembledBatteries: AssembledBattery[] = assembledBatteriesSheet ? XLSX.utils.sheet_to_json(assembledBatteriesSheet) : [];
        const restoredCustomers: Customer[] = customersSheet ? XLSX.utils.sheet_to_json(customersSheet) : [];

        restoreAllData({
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
  
  const handleDeleteSelf = async () => {
    try {
        await deleteCurrentUser();
        toast({
            title: "Account Deleted",
            description: "Your account has been successfully deleted.",
        });
    } catch(e: any) {
         toast({
            variant: "destructive",
            title: "Deletion Failed",
            description: e.message || "Could not delete your account at this time.",
        });
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Backup & Restore</CardTitle>
          <CardDescription>
            Download your current data as an Excel file for backup, or restore
            the application state from a backup file.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
            <Button onClick={handleDownload} variant="outline" size="lg" className="h-24">
                <div className="flex flex-col items-center gap-2">
                    <Download className="h-8 w-8"/>
                    <span>Download Full Backup</span>
                </div>
            </Button>
            <Button onClick={() => document.getElementById('restore-input')?.click()} variant="outline" size="lg" className="h-24">
                <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8"/>
                    <span>Restore from Backup</span>
                </div>
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
            These actions are irreversible. Please proceed with caution.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full md:w-auto">
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
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full md:w-auto">
                        <UserX className="mr-2 h-4 w-4" />
                        Delete My Account
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action is permanent and will delete your authentication record and user profile. You will be logged out immediately.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90"
                        onClick={handleDeleteSelf}
                    >
                        Yes, delete my account
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </CardContent>
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
