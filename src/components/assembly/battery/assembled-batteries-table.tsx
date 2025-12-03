
"use client";

import { useInventory } from "@/context/inventory-context-firebase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
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
  } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast";
import { Timestamp } from "firebase/firestore";

export function AssembledBatteriesTable() {
  const { assembledBatteries, getBatteryModel, deleteAssembledBattery } = useInventory();
  const { toast } = useToast();

  const handleDelete = (batteryId: string, modelName: string, serialNumber: string, restock: boolean) => {
    deleteAssembledBattery(batteryId, restock);
    toast({
        variant: "destructive",
        title: "Battery Deleted",
        description: `The ${modelName} with serial ${serialNumber} has been deleted. ${restock ? 'Parts have been restocked.' : ''}`
    });
  }

   const formatDate = (date: any) => {
    if (date instanceof Timestamp) return date.toDate().toLocaleDateString();
    if (date instanceof Date) return date.toLocaleDateString();
    return "N/A";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assembled Batteries</CardTitle>
        <CardDescription>
          A list of all batteries that have been assembled.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>S.No</TableHead>
                <TableHead>Model Name</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>Assembly Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assembledBatteries.length > 0 ? (
                assembledBatteries.map((battery, index) => {
                  const model = getBatteryModel(battery.modelId);
                  return (
                    <TableRow key={battery.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{model?.name || "Unknown Model"}</TableCell>
                      <TableCell>{battery.serialNumber}</TableCell>
                      <TableCell>
                        {formatDate(battery.assemblyDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Assembled Battery?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Do you want to restock the parts from this battery back into inventory, or just delete the battery record?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(battery.id, model?.name || '', battery.serialNumber, false)}>
                                Delete Only
                              </AlertDialogAction>
                              <AlertDialogAction onClick={() => handleDelete(battery.id, model?.name || '', battery.serialNumber, true)}>
                                Delete and Restock
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center"
                  >
                    No assembled batteries yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
