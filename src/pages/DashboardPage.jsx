import { WelcomeBanner } from '../components/dashboard/WelcomeBanner';
import { InventoryOverviewCard } from '../components/dashboard/InventoryOverviewCard';
import { CriticalAlertsCard } from '../components/dashboard/CriticalAlertsCard';
import { SystemStatusCard } from '../components/dashboard/SystemStatusCard';
import { InventoryDistributionChart } from '../components/dashboard/InventoryDistributionChart';
import { StockMovementChart } from '../components/dashboard/StockMovementChart';
import { RecentActivityPanel } from '../components/dashboard/RecentActivityPanel';
import { QuickActionsPanel } from '../components/dashboard/QuickActionsPanel';
import { TodaysInsightCard } from '../components/dashboard/TodaysInsightCard';

export const DashboardPage = () => {
  return (
    <div className="space-y-6 pb-6">
      {/* 1. Welcome Banner */}
      <WelcomeBanner />

      {/* 2, 3, 4. KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InventoryOverviewCard />
        <CriticalAlertsCard />
        <SystemStatusCard />
      </div>

      {/* 5, 6. Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InventoryDistributionChart />
        <StockMovementChart />
      </div>

      {/* 7, 8. Recent Activity & Quick Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivityPanel />
        <QuickActionsPanel />
      </div>

      {/* 9. Today's Insight */}
      <TodaysInsightCard />
    </div>
  );
};