
import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateSaleForm } from "@/components/sales/create-sale-form";

function CreateSalePageContent() {
  return (
    <>
      <Header title="Create New Sale" />
      <CreateSaleForm />
    </>
  );
}

export default function CreateSalePage() {
    return (
        <Suspense fallback={
            <>
                <Header title="Create New Sale" />
                <Skeleton className="h-[700px] w-full" />
            </>
        }>
            <CreateSalePageContent />
        </Suspense>
    )
}
