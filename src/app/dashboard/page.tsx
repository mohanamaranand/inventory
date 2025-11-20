import { Header } from "@/components/layout/header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";

export default function DashboardPage() {
  return (
    <>
      <Header title="Dashboard" />
      <div className="space-y-8">
        <StatsCards />
        <AnalyticsDashboard />
      </div>
    </>
  );
}
