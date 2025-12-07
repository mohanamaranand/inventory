
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

type PendingChange = {
    type: 'create' | 'update' | 'delete';
    collection: string;
    id: string;
    payload?: any;
}

interface SyncDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  pendingChanges: PendingChange[];
  isAutoSync: boolean;
}

const AUTO_SYNC_TIMEOUT = 60 * 1000; // 1 minute

function getChangeDescription(change: PendingChange): string {
    const { type, collection, payload } = change;
    const collectionName = collection.replace(/([A-Z])/g, ' $1').toLowerCase();

    switch (type) {
        case 'create':
            return `Create new ${collectionName}: ${payload?.name || payload?.productName || `ID ${change.id.substring(0,6)}...`}`;
        case 'update':
            const fields = Object.keys(payload).join(', ');
            return `Update ${collectionName} (ID: ${change.id.substring(0,6)}...): changed ${fields}`;
        case 'delete':
            return `Delete ${collectionName} (ID: ${change.id.substring(0,6)}...)`;
        default:
            return "Unknown change";
    }
}


export function SyncDialog({ isOpen, onOpenChange, onConfirm, pendingChanges, isAutoSync }: SyncDialogProps) {
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        if (isOpen && isAutoSync) {
            setProgress(100);
            const interval = setInterval(() => {
                setProgress(prev => {
                    if (prev <= 0) {
                        clearInterval(interval);
                        onConfirm();
                        return 0;
                    }
                    return prev - (100 / (AUTO_SYNC_TIMEOUT / 1000));
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [isOpen, isAutoSync, onConfirm]);

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Pending Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have {pendingChanges.length} unsynced changes. Review them below and click "Sync Now" to save them to the cloud.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ScrollArea className="h-64 border rounded-md p-4">
            <div className="space-y-3">
                {pendingChanges.map((change, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                        <span className="truncate pr-4">{getChangeDescription(change)}</span>
                        <Badge variant={change.type === 'create' ? 'default' : change.type === 'delete' ? 'destructive' : 'secondary'}>
                            {change.type}
                        </Badge>
                    </div>
                ))}
            </div>
        </ScrollArea>
        {isAutoSync && (
             <div className="space-y-2 pt-4">
                <p className="text-sm text-center text-muted-foreground">Auto-syncing in a moment...</p>
                <Progress value={progress} />
             </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Sync Now ({pendingChanges.length})
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
