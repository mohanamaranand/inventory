
import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerClient } from "@/components/customers/customer-client";

export default function CustomersPage() {
    return (
        <>
            <Header title="Customers" />
            <Suspense fallback={<Skeleton className="h-[700px] w-full" />}>
                <CustomerClient />
            </Suspense>
        </>
    )
}
