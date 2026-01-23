import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { DashboardHeader, LabelFilter } from '@/components/dashboard/Header';
import { CommandCenter } from '@/components/pages/CommandCenter';
import { RevenueDeepDive } from '@/components/pages/RevenueDeepDive';
import { MarketingBattle } from '@/components/pages/MarketingBattle';
import { useFilteredData } from '@/hooks/useFashionData';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

type Page = 'dashboard' | 'revenue' | 'marketing';

const pageConfig: Record<Page, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Commandocentrum',
    subtitle: 'Je ochtend briefing in één oogopslag',
  },
  revenue: {
    title: 'Omzet Analyse',
    subtitle: 'Jaar-op-jaar prestatie analyse',
  },
  marketing: {
    title: 'Marketing Strijd',
    subtitle: 'Platform prestatie vergelijking',
  },
};

function DashboardContent() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const { refetch } = useFilteredData();
  
  const config = pageConfig[currentPage];
  
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar currentPage={currentPage} onNavigate={(p) => setCurrentPage(p as Page)} />
      
      <main className="flex-1 flex flex-col">
        <DashboardHeader 
          title={config.title} 
          subtitle={config.subtitle}
          onRefresh={() => refetch()}
        />
        
        {/* Label Filter */}
        <div className="px-8 py-4 bg-card border-b border-border">
          <LabelFilter />
        </div>
        
        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          {currentPage === 'dashboard' && <CommandCenter />}
          {currentPage === 'revenue' && <RevenueDeepDive />}
          {currentPage === 'marketing' && <MarketingBattle />}
        </div>
      </main>
    </div>
  );
}

export function Dashboard() {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent />
    </QueryClientProvider>
  );
}

export default Dashboard;
