
"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { SalesClient } from "@/components/sales/sales-client";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

function SalesPageContent() {
  return (
    <>
      <Header title="Sales History">
        <Button asChild>
          <Link href="/sales/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Sale
          </Link>
        </Button>
      </Header>
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
