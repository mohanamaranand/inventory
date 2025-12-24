
'use client';

import { Header } from "@/components/layout/header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { SalesPurchasesChart } from "@/components/dashboard/sales-purchases-chart";
import { ProductionSummary } from "@/components/dashboard/production-summary";
import { StatusWidget } from "@/components/dashboard/status-widget";
import { CategoryWidget } from "@/components/dashboard/category-widget";
import { Suspense, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/firebase";
import { TopPerformingProducts } from "@/components/dashboard/top-performing-products";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { LowStockWidget } from "@/components/dashboard/low-stock-widget";
import { FaultyVehiclesWidget } from "@/components/dashboard/faulty-vehicles-widget";
import { InventoryForm } from "@/components/inventory/inventory-form";

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
    const isOwner = user?.role === 'owner';
    const isAdmin = user?.role === 'administrator';
    const isPrivilegedUser = isOwner || isAdmin;
    
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const handleEdit = (id: string) => {
        setEditingItemId(id);
        setIsFormOpen(true);
    };

    const handleFormSubmit = () => {
        setIsFormOpen(false);
        setEditingItemId(null);
    };

    return (
        <Suspense fallback={<DashboardLoadingSkeleton />}>
            {loading ? (
                <DashboardLoadingSkeleton />
            ) : (
                <>
                    <Header title={isPrivilegedUser ? "Dashboard (Admin)" : "Dashboard"} />
                    
                    <div className="space-y-8">
                        <StatsCards />

                        {isPrivilegedUser && (
                             <div className="grid gap-6 md:grid-cols-1">
                                <div>
                                    <TopPerformingProducts />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-7">
                            <div className="lg:col-span-4 space-y-6">
                                <SalesPurchasesChart />
                                <ProductionSummary />
                            </div>
                            <div className="lg:col-span-3 space-y-6 flex flex-col gap-6">
                                <RecentActivity />
                                <FaultyVehiclesWidget onEdit={handleEdit} />
                                <LowStockWidget />
                                <CategoryWidget />
                                <StatusWidget />
                            </div>
                        </div>
                    </div>
                    <InventoryForm 
                        open={isFormOpen} 
                        onOpenChange={setIsFormOpen} 
                        onFormSubmit={handleFormSubmit}
                        itemId={editingItemId}
                    />
                </>
            )}
        </Suspense>
    );
}
