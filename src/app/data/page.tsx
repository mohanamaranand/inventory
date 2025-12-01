
import { Header } from "@/components/layout/header";
import { DataManagement } from "@/components/data/data-management";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function DataPageContent() {
    return (
        <>
            <Header title="Data Management" />
            <DataManagement />
        </>
    );
}

export default function DataPage() {
    return (
        <Suspense fallback={
            <>
                <Header title="Data Management" />
                <Skeleton className="h-[400px] w-full" />
            </>
        }>
            <DataPageContent />
        </Suspense>
    )
}
