
"use client";

import { useInventory } from "@/context/inventory-context";
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

export function AssembledVehiclesTable() {
  const { assembledVehicles, getVehicleModel, deleteAssembledVehicle } = useInventory();
  const { toast } = useToast();

  const handleDelete = (vehicleId: string, modelName: string, chassisNumber: string) => {
    deleteAssembledVehicle(vehicleId);
    toast({
        variant: "destructive",
        title: "Vehicle Deleted",
        description: `The ${modelName} with chassis ${chassisNumber} has been deleted.`
    });
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
                <TableHead className="text-right">Actions</TableHead>
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
                        {vehicle.assemblyDate.toLocaleDateString()}
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
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the assembled vehicle record and its corresponding entry in the inventory.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(vehicle.id, model?.name || '', vehicle.chassisNumber)}>
                                Delete
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
                    colSpan={6}
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
