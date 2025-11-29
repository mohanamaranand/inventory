
import { Header } from "@/components/layout/header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";
import { BuildableVehicles } from "@/components/dashboard/buildable-vehicles";
import { StatusWidget } from "@/components/dashboard/status-widget";

export default function DashboardPage() {
  return (
    <>
      <Header title="Dashboard" />
      <div className="space-y-8">
        <StatsCards />
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-2">
                <BuildableVehicles />
            </div>
            <div className="lg:col-span-1">
                <StatusWidget />
            </div>
        </div>
        <AnalyticsDashboard />
      </div>
    </>
  );
}
