
"use client";

import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportsClient } from "@/components/reports/reports-client";

function ReportsPageContent() {
  return (
    <>
      <Header title="Inventory Reports" />
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
