
'use client';

import { Header } from "@/components/layout/header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { SalesPurchasesChart } from "@/components/dashboard/sales-purchases-chart";
import { ProductionSummary } from "@/components/dashboard/production-summary";
import { StatusWidget } from "@/components/dashboard/status-widget";
import { CategoryWidget } from "@/components/dashboard/category-widget";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/firebase";
import { ProfitLossChart } from "@/components/dashboard/profit-loss-chart";
import { TopPerformingProducts } from "@/components/dashboard/top-performing-products";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { LowStockWidget } from "@/components/dashboard/low-stock-widget";

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

export default function DashboardPage() {
    const { user, loading } = useUser();
    const isPrivilegedUser = user?.role === 'owner' || user?.role === 'administrator';

    return (
        <Suspense fallback={<DashboardLoadingSkeleton />}>
            {loading ? (
                <DashboardLoadingSkeleton />
            ) : (
                <>
                    <Header title="Dashboard" />
                    <div className="space-y-8">
                        <StatsCards />

                        {isPrivilegedUser && (
                            <div className="space-y-8">
                                <ProfitLossChart />
                                <TopPerformingProducts />
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-7">
                            <div className="lg:col-span-4 space-y-6">
                                <SalesPurchasesChart />
                                <ProductionSummary />
                            </div>
                            <div className="lg:col-span-3 space-y-6 flex flex-col gap-6">
                                <RecentActivity />
                                <LowStockWidget />
                                <CategoryWidget />
                                <StatusWidget />
                            </div>
                        </div>
                    </div>
                </>
            )}
        </Suspense>
    );
}
