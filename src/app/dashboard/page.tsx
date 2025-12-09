
import { Header } from "@/components/layout/header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { SalesPurchasesChart } from "@/components/dashboard/sales-purchases-chart";
import { ProductionSummary } from "@/components/dashboard/production-summary";
import { StatusWidget } from "@/components/dashboard/status-widget";
import { CategoryWidget } from "@/components/dashboard/category-widget";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function DashboardPageContent() {
    return (
        <>
            <Header title="Dashboard" />
            <div className="space-y-4">
                <StatsCards />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <div className="col-span-1 lg:col-span-4 space-y-4">
                       <SalesPurchasesChart />
                       <ProductionSummary />
                    </div>
                     <div className="col-span-1 lg:col-span-3 space-y-4">
                        <StatusWidget />
                        <CategoryWidget />
                    </div>
                </div>
            </div>
        </>
    );
}


export default function DashboardPage() {
    return (
        <Suspense fallback={<DashboardLoadingSkeleton />}>
            <DashboardPageContent />
        </Suspense>
    );
}

function DashboardLoadingSkeleton() {
    return (
        <div className="space-y-4">
            <Header title="Dashboard" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
            </div>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="lg:col-span-4 space-y-4">
                    <Skeleton className="h-96" />
                    <Skeleton className="h-80" />
                </div>
                <div className="lg:col-span-3 space-y-4">
                    <Skeleton className="h-64" />
                    <Skeleton className="h-64" />
                </div>
            </div>
        </div>
    );
}
