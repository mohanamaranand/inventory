
import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerClient } from "@/components/customers/customer-client";

function CustomersPageContent() {
  return (
    <>
      <Header title="Customers" />
      <CustomerClient />
    </>
  );
}

export default function CustomersPage() {
    return (
        <Suspense fallback={
            <>
                <Header title="Customers" />
                <Skeleton className="h-[700px] w-full" />
            </>
        }>
            <CustomersPageContent />
        </Suspense>
    )
}
