
"use client";

import { useState, useEffect } from "react";
import { useInventory } from "@/context/inventory-context-firebase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Cloud, CloudCog } from "lucide-react";
import { SyncDialog } from "./sync-dialog";

const AUTO_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function SyncStatus() {
  const { pendingChanges, syncChanges } = useInventory();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAutoSync, setIsAutoSync] = useState(false);

  useEffect(() => {
    if (pendingChanges.length === 0) return;

    const timer = setInterval(() => {
      setIsAutoSync(true);
      setIsDialogOpen(true);
    }, AUTO_SYNC_INTERVAL);

    return () => clearInterval(timer);
  }, [pendingChanges.length]);

  if (pendingChanges.length === 0) {
    return (
      <Button variant="ghost" size="icon" className="relative h-8 w-8 text-green-500" disabled>
        <Cloud className="h-5 w-5" />
      </Button>
    );
  }

  const handleManualOpen = () => {
    setIsAutoSync(false);
    setIsDialogOpen(true);
  };
  
  const handleSync = async () => {
      await syncChanges();
      setIsDialogOpen(false);
  }

  return (
    <>
      <Button variant="ghost" size="icon" className="relative h-8 w-8 text-yellow-500 animate-pulse" onClick={handleManualOpen}>
        <CloudCog className="h-5 w-5" />
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0"
        >
          {pendingChanges.length}
        </Badge>
      </Button>
      <SyncDialog 
        isOpen={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        onConfirm={handleSync}
        pendingChanges={pendingChanges}
        isAutoSync={isAutoSync}
      />
    </>
  );
}
