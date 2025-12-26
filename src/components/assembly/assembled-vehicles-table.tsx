
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
import { useUser } from "@/firebase/auth/use-user";

export function AssembledVehiclesTable() {
  const { assembledVehicles, getVehicleModel, deleteAssembledVehicle } = useInventory();
  const { toast } = useToast();
  const { user } = useUser();
  const isPrivilegedUser = user?.role === 'owner' || user?.role === 'administrator';


  const handleDelete = (vehicleId: string, modelName: string, chassisNumber: string, restock: boolean) => {
    deleteAssembledVehicle(vehicleId, restock);
    toast({
        variant: "destructive",
        title: "Vehicle Deleted",
        description: `The ${modelName} with chassis ${chassisNumber} has been deleted. ${restock ? 'Parts have been restocked.' : ''}`
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
        <CardTitle>Assembled Vehicles</CardTitle>
        <CardDescription>
          A list of all vehicles that have been assembled.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>S.No</TableHead>
                <TableHead>Model Name</TableHead>
                <TableHead>Chassis Number</TableHead>
                <TableHead>Motor Number</TableHead>
                <TableHead>Assembly Date</TableHead>
                {isPrivilegedUser && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {assembledVehicles.length > 0 ? (
                assembledVehicles.map((vehicle, index) => {
                  const model = getVehicleModel(vehicle.modelId);
                  return (
                    <TableRow key={vehicle.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{model?.name || "Unknown Model"}</TableCell>
                      <TableCell>{vehicle.chassisNumber}</TableCell>
                      <TableCell>{vehicle.motorNumber}</TableCell>
                      <TableCell>
                        {formatDate(vehicle.assemblyDate)}
                      </TableCell>
                      {isPrivilegedUser && (
                        <TableCell className="text-right">
                            <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon">
                                <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Delete Assembled Vehicle?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Do you want to restock the parts from this vehicle back into inventory, or just delete the vehicle record?
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(vehicle.id, model?.name || '', vehicle.chassisNumber, false)}>
                                    Delete Only
                                </AlertDialogAction>
                                <AlertDialogAction onClick={() => handleDelete(vehicle.id, model?.name || '', vehicle.chassisNumber, true)}>
                                    Delete and Restock
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={isPrivilegedUser ? 6 : 5}
                    className="h-24 text-center"
                  >
                    No assembled vehicles yet.
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
