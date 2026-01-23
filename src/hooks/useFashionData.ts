import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { DailyMetrics, MonthlyTarget, HarmonizedData } from '@/types';
import { DataHarmonizer, fetchGoogleSheetCSV } from '@/utils/dataHarmonizer';
import { useDashboardStore } from '@/store/dashboardStore';
import { toast } from '@/hooks/use-toast';

// ============================================
// MOCK DATA GENERATION
// ============================================

const LABELS = ['Fashionmusthaves', 'Jurkjes', 'Trendwear', 'StyleHub', 'ChicCollection'];

function generateMockData(year: number): Record<string, string>[] {
  const data: Record<string, string>[] = [];
  const startDate = new Date(year, 0, 1);
  const endDate = year === 2026 ? new Date() : new Date(year, 11, 31);
  
  const current = new Date(startDate);
  
  while (current <= endDate) {
    for (const label of LABELS.slice(0, 2)) { // Just use first 2 labels for mock
      const dayOfWeek = current.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const month = current.getMonth();
      
      // Seasonal multipliers
      const seasonalMultiplier = 
        month === 10 || month === 11 ? 1.5 : // Nov-Dec peak
        month === 0 ? 0.7 : // January slump
        month >= 6 && month <= 8 ? 0.85 : // Summer dip
        1;
      
      // Weekend boost
      const weekendMultiplier = isWeekend ? 1.3 : 1;
      
      // Base values with some randomness
      const baseRevenue = 15000 + Math.random() * 10000;
      const revWeb = Math.round(baseRevenue * 0.65 * seasonalMultiplier * weekendMultiplier);
      const revApp = Math.round(baseRevenue * 0.35 * seasonalMultiplier * weekendMultiplier);
      const orders = Math.round((revWeb + revApp) / (45 + Math.random() * 15));
      const spendFB = Math.round((revWeb + revApp) * (0.12 + Math.random() * 0.06));
      const spendGoogle = Math.round((revWeb + revApp) * (0.08 + Math.random() * 0.04));
      const clicksFB = Math.round(spendFB / (0.5 + Math.random() * 0.3));
      const clicksGoogle = Math.round(spendGoogle / (0.8 + Math.random() * 0.4));
      
      data.push({
        Date: current.toISOString().split('T')[0],
        Label: label,
        Rev_Web: revWeb.toString(),
        Rev_App: revApp.toString(),
        Orders: orders.toString(),
        Spend_FB: spendFB.toString(),
        Spend_Google: spendGoogle.toString(),
        Clicks_FB: clicksFB.toString(),
        Clicks_Google: clicksGoogle.toString(),
      });
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  return data;
}

function generateMockTargets(): Record<string, string>[] {
  const targets: Record<string, string>[] = [];
  
  for (let month = 0; month < 12; month++) {
    for (const label of LABELS.slice(0, 2)) {
      const monthStr = `2026-${String(month + 1).padStart(2, '0')}`;
      
      // Higher targets for peak months
      const seasonalMultiplier = 
        month === 10 || month === 11 ? 1.5 :
        month === 0 ? 0.8 :
        1;
      
      targets.push({
        Month: monthStr,
        Label: label,
        Revenue_Target: Math.round(650000 * seasonalMultiplier).toString(),
        Orders_Target: Math.round(12000 * seasonalMultiplier).toString(),
        MER_Target: '0.18',
      });
    }
  }
  
  return targets;
}

// ============================================
// DATA FETCHING HOOK
// ============================================

interface UseFashionDataOptions {
  googleSheetId?: string;
  staleTime?: number;
}

export function useFashionData(options: UseFashionDataOptions = {}) {
  const { googleSheetId, staleTime = 5 * 60 * 1000 } = options; // 5 minutes default
  const setLoading = useDashboardStore((s) => s.setLoading);
  const setLastRefresh = useDashboardStore((s) => s.setLastRefresh);
  
  const query = useQuery({
    queryKey: ['fashion-data', googleSheetId],
    queryFn: async (): Promise<HarmonizedData> => {
      setLoading(true);
      
      const harmonizer = new DataHarmonizer();
      
      try {
        // Add historical data (mocked for demo)
        const historical2024 = generateMockData(2024);
        const historical2025 = generateMockData(2025);
        
        harmonizer.addHistoricalData(historical2024, 2024);
        harmonizer.addHistoricalData(historical2025, 2025);
        
        // Try to fetch live data from Google Sheet
        if (googleSheetId) {
          try {
            const liveData = await fetchGoogleSheetCSV(googleSheetId, '0');
            const result = harmonizer.addLiveData(liveData);
            
            if (result.errors > 0) {
              toast({
                title: 'Data Warning',
                description: `${result.errors} rows in the live data had validation issues`,
                variant: 'destructive',
              });
            }
            
            // Fetch targets from second tab
            const targetsData = await fetchGoogleSheetCSV(googleSheetId, '1');
            harmonizer.addTargets(targetsData);
          } catch (error) {
            console.warn('Failed to fetch Google Sheet, using mock data:', error);
            // Fall back to mock 2026 data
            const live2026 = generateMockData(2026);
            harmonizer.addLiveData(live2026);
            harmonizer.addTargets(generateMockTargets());
          }
        } else {
          // Use mock 2026 data
          const live2026 = generateMockData(2026);
          harmonizer.addLiveData(live2026);
          harmonizer.addTargets(generateMockTargets());
        }
        
        const errors = harmonizer.getErrors();
        if (errors.length > 0) {
          console.warn('Data harmonization warnings:', errors);
        }
        
        const result = harmonizer.harmonize(true);
        setLastRefresh(result.lastUpdated);
        
        return result;
      } finally {
        setLoading(false);
      }
    },
    staleTime,
    refetchOnWindowFocus: false,
  });
  
  return query;
}

// ============================================
// FILTERED DATA HOOK
// ============================================

export function useFilteredData() {
  const { data: harmonizedData, ...queryState } = useFashionData();
  const filters = useDashboardStore((s) => s.filters);
  
  const filteredMetrics = useMemo(() => {
    if (!harmonizedData) return [];
    
    let metrics = harmonizedData.metrics;
    
    // Filter by date range
    metrics = metrics.filter((m) => {
      const date = new Date(m.date);
      return date >= filters.dateRange.start && date <= filters.dateRange.end;
    });
    
    // Filter by labels
    if (filters.labels.length > 0) {
      metrics = metrics.filter((m) => filters.labels.includes(m.label as any));
    }
    
    return metrics;
  }, [harmonizedData, filters.dateRange, filters.labels]);
  
  const currentTarget = useMemo(() => {
    if (!harmonizedData) return null;
    
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Aggregate targets for selected labels
    const relevantTargets = harmonizedData.targets.filter((t) => 
      t.month === monthStr && filters.labels.includes(t.label as any)
    );
    
    if (relevantTargets.length === 0) {
      // Return a default target
      return {
        month: monthStr,
        label: 'All',
        revenueTarget: 1200000,
        ordersTarget: 24000,
        merTarget: 0.18,
      };
    }
    
    return {
      month: monthStr,
      label: 'Combined',
      revenueTarget: relevantTargets.reduce((sum, t) => sum + t.revenueTarget, 0),
      ordersTarget: relevantTargets.reduce((sum, t) => sum + t.ordersTarget, 0),
      merTarget: relevantTargets[0].merTarget,
    };
  }, [harmonizedData, filters.labels]);
  
  return {
    metrics: filteredMetrics,
    target: currentTarget,
    allMetrics: harmonizedData?.metrics || [],
    allTargets: harmonizedData?.targets || [],
    ...queryState,
  };
}
