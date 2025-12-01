
"use client";

import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { SalesClient } from "@/components/sales/sales-client";

function SalesPageContent() {
  return (
    <>
      <Header title="Sales History" />
      <SalesClient />
    </>
  );
}

export default function SalesPage() {
    return (
        <Suspense fallback={
            <>
                <Header title="Sales History" />
                <Skeleton className="h-[700px] w-full" />
            </>
        }>
            <SalesPageContent />
        </Suspense>
    )
}
