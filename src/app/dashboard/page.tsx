
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
            <div className="space-y-8">
                <StatsCards />
                <div className="grid gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-8">
                        <SalesPurchasesChart />
                        <ProductionSummary />
                    </div>
                    <div className="grid gap-8 lg:col-start-3 lg:row-start-2">
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
        <div className="space-y-8">
            <Header title="Dashboard" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
            </div>
             <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-8">
                    <Skeleton className="h-80" />
                    <Skeleton className="h-64" />
                </div>
                <div className="space-y-8">
                    <Skeleton className="h-40" />
                    <Skeleton className="h-40" />
                </div>
            </div>
        </div>
    );
}
