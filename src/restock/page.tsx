
import { Header } from "@/components/layout/header";
import { RestockSuggestions } from "@/components/restock/restock-suggestions";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function RestockPage() {
  return (
    <>
      <Header title="Restock Suggestions" />
      <Suspense fallback={<RestockLoadingSkeleton />}>
        <RestockSuggestions />
      </Suspense>
    </>
  );
}

function RestockLoadingSkeleton() {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="flex flex-col space-y-3">
                    <Skeleton className="h-[125px] w-full rounded-xl" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                    </div>
                </div>
            ))}
        </div>
    )
}
