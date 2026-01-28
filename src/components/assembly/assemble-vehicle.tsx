
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useInventory } from "@/context/inventory-context-firebase";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, AlertTriangle, Info, Play, Pause } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  modelId: z.string().min(1, "Please select a vehicle model."),
  chassisNumber: z.string().min(1, "Chassis number is required."),
  motorNumber: z.string().min(1, "Motor number is required."),
});

type AssemblyQueueItem = z.infer<typeof formSchema> & {
    id: string;
    modelName: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
    error?: string;
};

export function AssembleVehicle() {
  const { vehicleModels, assembleVehicle, inventory, assembledVehicles } = useInventory();
  const { toast } = useToast();
  
  // Queue State
  const [queue, setQueue] = useState<AssemblyQueueItem[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [isQueuePaused, setIsQueuePaused] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      modelId: "",
      chassisNumber: "",
      motorNumber: "",
    },
  });

  const selectedModelId = form.watch("modelId");
  const chassisNumberInput = form.watch("chassisNumber");
  const motorNumberInput = form.watch("motorNumber");

  // Duplicate Checking
  const duplicateCheck = useMemo(() => {
    // Only check if input has value
    if (!chassisNumberInput && !motorNumberInput) {
        return { chassisExists: false, motorExists: false };
    }

    const chassisExists = chassisNumberInput.length > 0 && (
        assembledVehicles.some(v => v.chassisNumber === chassisNumberInput) || 
        queue.some(q => q.chassisNumber === chassisNumberInput && q.status !== 'error')
    );
    const motorExists = motorNumberInput.length > 0 && (
        assembledVehicles.some(v => v.motorNumber === motorNumberInput) ||
        queue.some(q => q.motorNumber === motorNumberInput && q.status !== 'error')
    );
    
    return { chassisExists, motorExists };
  }, [chassisNumberInput, motorNumberInput, assembledVehicles, queue]);

  // Selected Model & Parts Availability
  const selectedModelData = useMemo(() => {
    if (!selectedModelId) return null;
    
    const model = vehicleModels.find(m => m.id === selectedModelId);
    if (!model) return null;

    const partsAnalysis = model.parts.map(part => {
        const inventoryItem = inventory.find(i => i.itemStdCode === part.itemStdCode);
        // Calculate reserved quantity from pending queue items
        const pendingCountInQueue = queue.filter(
            q => q.modelId === selectedModelId && (q.status === 'pending' || q.status === 'processing')
        ).length;
        
        // We do not subtract the current form's potential usage, just what's already committed in queue
        const reservedQuantity = pendingCountInQueue * part.quantity;
        const availableStock = (inventoryItem?.quantity || 0) - reservedQuantity;
        const isEnough = availableStock >= part.quantity;

        return {
            ...part,
            productName: inventoryItem?.productName || "Unknown Part",
            availableStock,
            stockStatus: isEnough ? "Available" : "Unavailable",
            isEnough
        };
    });

    const allPartsAvailable = partsAnalysis.every(p => p.isEnough);

    return { model, partsAnalysis, allPartsAvailable };
  }, [selectedModelId, vehicleModels, inventory, queue]);


  // Queue Processing Effect
  useEffect(() => {
      const processNext = async () => {
          if (isQueuePaused || isProcessingQueue) return;
          
          const pendingItems = queue.filter(i => i.status === 'pending');
          if (pendingItems.length === 0) return;

          const nextItemIndex = queue.findIndex(i => i.status === 'pending');
          if (nextItemIndex === -1) return;

          setIsProcessingQueue(true);
          const item = queue[nextItemIndex];

          // Update status to processing
          setQueue(prev => prev.map((q, i) => i === nextItemIndex ? { ...q, status: 'processing' } : q));

          try {
             await assembleVehicle({
                modelId: item.modelId,
                chassisNumber: item.chassisNumber,
                motorNumber: item.motorNumber,
                modelName: item.modelName,
             });
             
             // Update status to completed
             setQueue(prev => prev.map((q, i) => i === nextItemIndex ? { ...q, status: 'completed' } : q));
             
             toast({
                 title: "Assembly Complete",
                 description: `${item.modelName} (Chassis: ${item.chassisNumber}) assembled successfully.`
             });

             // Auto-remove completed ones after 3 seconds
             setTimeout(() => {
                setQueue(prev => prev.filter(q => q.id !== item.id));
             }, 3000);

          } catch (error: any) {
              setQueue(prev => prev.map((q, i) => i === nextItemIndex ? { ...q, status: 'error', error: error.message } : q));
              setIsQueuePaused(true); // Pause on error so user can see it
              toast({
                  variant: "destructive",
                  title: "Assembly Failed",
                  description: `Failed to assemble ${item.modelName}. Queue paused.`
              });
          } finally {
              setIsProcessingQueue(false);
          }
      };

      processNext();
  }, [queue, isProcessingQueue, isQueuePaused, assembleVehicle, toast]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Final Validation
    if (duplicateCheck.chassisExists) {
        form.setError("chassisNumber", { message: "Chassis number already exists" });
        return;
    }
    if (duplicateCheck.motorExists) {
        form.setError("motorNumber", { message: "Motor number already exists" });
        return;
    }
    if (selectedModelData && !selectedModelData.allPartsAvailable) {
        toast({
            variant: "destructive",
            title: "Insufficient Parts",
            description: "Cannot queue assembly. Some parts are out of stock."
        });
        return;
    }

    const selectedModel = vehicleModels.find(m => m.id === values.modelId);
    if (!selectedModel) return;

    const newItem: AssemblyQueueItem = {
        ...values,
        id: Math.random().toString(36).substring(7),
        modelName: selectedModel.name,
        status: 'pending'
    };

    setQueue(prev => [...prev, newItem]);
    
    toast({
        title: "Added to Queue",
        description: "Vehicle assembly has been queued."
    });

    // Reset only chassis and motor, keep model
    form.reset({
        modelId: values.modelId,
        chassisNumber: "",
        motorNumber: ""
    });
    // Manually clear errors if any persisted
    form.clearErrors();
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column: Form & Model Details */}
        <div className="space-y-6">
            <Card>
            <CardHeader>
                <CardTitle>Assemble Vehicle</CardTitle>
                <CardDescription>
                    Queue vehicles for assembly. They will be processed one by one.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                    control={form.control}
                    name="modelId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Vehicle Model</FormLabel>
                        <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                        >
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a model" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {vehicleModels.map((model) => (
                                <SelectItem key={model.id} value={model.id}>
                                {model.name}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                        control={form.control}
                        name="chassisNumber"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Chassis Number</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <Input 
                                        placeholder="Enter chassis number" 
                                        {...field} 
                                        className={duplicateCheck.chassisExists ? "border-red-500 pr-10" : ""} 
                                    />
                                    {duplicateCheck.chassisExists && (
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-red-500">
                                            <AlertTriangle className="h-4 w-4" />
                                        </div>
                                    )}
                                </div>
                            </FormControl>
                            {duplicateCheck.chassisExists && <p className="text-xs text-red-500 font-medium mt-1">Duplicate chassis number</p>}
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="motorNumber"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Motor Number</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <Input 
                                        placeholder="Enter motor number" 
                                        {...field} 
                                        className={duplicateCheck.motorExists ? "border-red-500 pr-10" : ""} 
                                    />
                                    {duplicateCheck.motorExists && (
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-red-500">
                                            <AlertTriangle className="h-4 w-4" />
                                        </div>
                                    )}
                                </div>
                            </FormControl>
                            {duplicateCheck.motorExists && <p className="text-xs text-red-500 font-medium mt-1">Duplicate motor number</p>}
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                    
                    <Button 
                        type="submit" 
                        className="w-full"
                        disabled={
                            !selectedModelId || 
                            duplicateCheck.chassisExists || 
                            duplicateCheck.motorExists || 
                            (selectedModelData ? !selectedModelData.allPartsAvailable : false)
                        }
                    >
                        Add to Assembly Queue
                    </Button>
                </form>
                </Form>
            </CardContent>
            </Card>

            {selectedModelData && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Parts Availability: {selectedModelData.model.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                         {!selectedModelData.allPartsAvailable && (
                            <Alert variant="destructive" className="mb-4">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Insufficient Stock</AlertTitle>
                                <AlertDescription>
                                    Some required parts are not available in the inventory.
                                </AlertDescription>
                            </Alert>
                         )}
                        
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Part Code</TableHead>
                                        <TableHead className="text-right">Req</TableHead>
                                        <TableHead className="text-right">Avail</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedModelData.partsAnalysis.map((part, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span>{part.itemStdCode}</span>
                                                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">{part.productName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">{part.quantity}</TableCell>
                                            <TableCell className="text-right">{part.availableStock}</TableCell>
                                            <TableCell className="text-center">
                                                {part.isEnough ? (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50 border-green-200">OK</Badge>
                                                ) : (
                                                    <Badge variant="destructive">Low</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>

        {/* Right Column: Queue Status */}
        <div className="space-y-6">
            <Card className="h-full flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="space-y-1">
                        <CardTitle>Assembly Queue</CardTitle>
                        <CardDescription>
                            {queue.length} items in queue ({queue.filter(i => i.status === 'pending').length} pending)
                        </CardDescription>
                    </div>
                    {queue.some(i => i.status === 'error') && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                                setIsQueuePaused(false);
                                setQueue(prev => prev.filter(i => i.status !== 'error')); // Clear errors to retry or just clear
                            }}
                        >
                            <Play className="mr-2 h-4 w-4" /> Resume
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden flex flex-col">
                    {queue.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground border-2 border-dashed rounded-lg">
                            <Info className="h-8 w-8 mb-2" />
                            <p>No vehicles in queue</p>
                        </div>
                    ) : (
                        <div className="space-y-4 overflow-y-auto pr-2 max-h-[500px]">
                            {queue.map((item) => (
                                <div key={item.id} className="flex items-start justify-between p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
                                    <div className="space-y-1">
                                        <p className="font-medium leading-none">{item.modelName}</p>
                                        <p className="text-sm text-muted-foreground">
                                            Chassis: {item.chassisNumber} • Motor: {item.motorNumber}
                                        </p>
                                        {item.error && (
                                            <p className="text-xs text-red-500 mt-1">{item.error}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center">
                                        {item.status === 'pending' && <Badge variant="secondary">Pending</Badge>}
                                        {item.status === 'processing' && (
                                            <Badge variant="default" className="bg-blue-500">
                                                <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Processing
                                            </Badge>
                                        )}
                                        {item.status === 'completed' && (
                                            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                                <CheckCircle className="mr-1 h-3 w-3" /> Done
                                            </Badge>
                                        )}
                                        {item.status === 'error' && (
                                            <Badge variant="destructive">
                                                <XCircle className="mr-1 h-3 w-3" /> Failed
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {queue.length > 0 && (
                        <div className="mt-4 pt-4 border-t flex justify-end">
                            <Button variant="ghost" size="sm" onClick={() => setQueue([])}>
                                Clear History
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
