
import { Header } from "@/components/layout/header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";
import { BuildableVehicles } from "@/components/dashboard/buildable-vehicles";
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
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <BuildableVehicles />
                    </div>
                    <div className="grid grid-cols-1 gap-8">
                        <StatusWidget />
                        <CategoryWidget />
                    </div>
                </div>
                <AnalyticsDashboard />
            </div>
        </>
    );
}


export default function DashboardPage() {
    return (
        <Suspense fallback={
            <div className="space-y-8">
                <Header title="Dashboard" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                </div>
                 <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <Skeleton className="h-80" />
                    </div>
                    <div className="grid grid-cols-1 gap-8">
                        <Skeleton className="h-40" />
                        <Skeleton className="h-40" />
                    </div>
                </div>
                <Skeleton className="h-64" />
            </div>
        }>
            <DashboardPageContent />
        </Suspense>
    );
}
