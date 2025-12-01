
"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportsClient } from "@/components/reports/reports-client";
import { Button } from "@/components/ui/button";
import { PlusCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"


function ReportsPageContent() {
  const { toast } = useToast();

  const handleCreateReportClick = () => {
    toast({
      title: "How to Create a Report Entry",
      description: "To create a report, find an item in your inventory, edit it, and change its status to 'Damaged', 'Missing', etc.",
      duration: 10000,
    });
  };

  return (
    <>
      <Header title="Inventory Reports">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
                <Button asChild onClick={handleCreateReportClick}>
                  <Link href="/inventory">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Report Entry
                  </Link>
                </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>A 'Report Entry' is created by changing an item's status in the inventory.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Header>
      <ReportsClient />
    </>
  );
}

export default function ReportsPage() {
    return (
        <Suspense fallback={
            <>
                <Header title="Inventory Reports" />
                <Skeleton className="h-[700px] w-full" />
            </>
        }>
            <ReportsPageContent />
        </Suspense>
    )
}
