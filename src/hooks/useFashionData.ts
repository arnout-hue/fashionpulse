import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { DailyMetrics, MonthlyTarget, HarmonizedData } from '@/types';
import { DataHarmonizer, fetchGoogleSheetCSV } from '@/utils/dataHarmonizer';
import { useDashboardStore } from '@/store/dashboardStore';
import { toast } from '@/hooks/use-toast';

// ============================================
// MOCK DATA GENERATION (European Format)
// ============================================

const LABELS = ['Fashionmusthaves', 'Jurkjes', 'Trendwear', 'StyleHub', 'ChicCollection'];

/**
 * Generate mock data in European format (d-m-yyyy dates, comma decimals)
 */
function generateMockDataEuropean(year: number): Record<string, string>[] {
  const data: Record<string, string>[] = [];
  const startDate = new Date(year, 0, 1);
  const endDate = year === 2026 ? new Date() : new Date(year, 11, 31);
  
  const current = new Date(startDate);
  
  while (current <= endDate) {
    for (const label of LABELS.slice(0, 2)) {
      const dayOfWeek = current.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const month = current.getMonth();
      
      // Seasonal multipliers
      const seasonalMultiplier = 
        month === 10 || month === 11 ? 1.5 :
        month === 0 ? 0.7 :
        month >= 6 && month <= 8 ? 0.85 :
        1;
      
      const weekendMultiplier = isWeekend ? 1.3 : 1;
      
      const baseRevenue = 15000 + Math.random() * 10000;
      const revWeb = baseRevenue * 0.65 * seasonalMultiplier * weekendMultiplier;
      const revApp = baseRevenue * 0.35 * seasonalMultiplier * weekendMultiplier;
      const ordersTotal = (revWeb + revApp) / (45 + Math.random() * 15);
      const ordersApp = ordersTotal * (0.3 + Math.random() * 0.1);
      const spendFB = (revWeb + revApp) * (0.12 + Math.random() * 0.06);
      const spendGoogle = (revWeb + revApp) * (0.08 + Math.random() * 0.04);
      const convFB = Math.round(spendFB / (0.5 + Math.random() * 0.3));
      const convGoogle = Math.round(spendGoogle / (0.8 + Math.random() * 0.4));
      
      // Format date as d-m-yyyy (European)
      const dateStr = `${current.getDate()}-${current.getMonth() + 1}-${current.getFullYear()}`;
      
      // Format numbers with comma as decimal separator (European)
      data.push({
        Date: dateStr,
        Label: label,
        Rev_Web: revWeb.toFixed(2).replace('.', ','),
        Rev_App: revApp.toFixed(2).replace('.', ','),
        Orders: ordersTotal.toFixed(2).replace('.', ','),
        Orders_App: ordersApp.toFixed(2).replace('.', ','),
        Conv_FB: convFB.toString(),
        Conv_Google: convGoogle.toString(),
        Spend_FB: spendFB.toFixed(2).replace('.', ','),
        Spend_Google: spendGoogle.toFixed(2).replace('.', ','),
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
  const { staleTime = 5 * 60 * 1000 } = options;
  const setLoading = useDashboardStore((s) => s.setLoading);
  const setLastRefresh = useDashboardStore((s) => s.setLastRefresh);
  const googleSheetId = useDashboardStore((s) => s.googleSheetId);
  
  const query = useQuery({
    queryKey: ['fashion-data', googleSheetId],
    queryFn: async (): Promise<HarmonizedData> => {
      setLoading(true);
      
      const harmonizer = new DataHarmonizer();
      
      try {
        // Add historical data (mocked with European format for consistency)
        const historical2024 = generateMockDataEuropean(2024);
        const historical2025 = generateMockDataEuropean(2025);
        
        // Use the European format parser for historical mock data
        harmonizer.addLiveDataEuropean(historical2024);
        harmonizer.addLiveDataEuropean(historical2025);
        
        // Try to fetch live data from Google Sheet
        if (googleSheetId) {
          try {
            console.log('Fetching Google Sheet:', googleSheetId);
            const liveData = await fetchGoogleSheetCSV(googleSheetId, '0');
            console.log('Fetched rows:', liveData.length, 'Sample:', liveData[0]);
            
            // Use European format parser for Google Sheet data
            const result = harmonizer.addLiveDataEuropean(liveData);
            
            if (result.errors > 0) {
              toast({
                title: 'Data Warning',
                description: `${result.errors} rows had parsing issues. Check console for details.`,
                variant: 'destructive',
              });
            } else {
              toast({
                title: 'Data Loaded',
                description: `Successfully loaded ${result.success} rows from Google Sheet`,
              });
            }
            
            // Fetch targets from second tab if available
            try {
              const targetsData = await fetchGoogleSheetCSV(googleSheetId, '1');
              harmonizer.addTargets(targetsData);
            } catch {
              console.log('No targets tab found, using defaults');
              harmonizer.addTargets(generateMockTargets());
            }
          } catch (error) {
            console.error('Failed to fetch Google Sheet:', error);
            toast({
              title: 'Connection Failed',
              description: 'Could not fetch Google Sheet. Using mock data.',
              variant: 'destructive',
            });
            // Fall back to mock 2026 data
            const live2026 = generateMockDataEuropean(2026);
            harmonizer.addLiveDataEuropean(live2026);
            harmonizer.addTargets(generateMockTargets());
          }
        } else {
          // Use mock 2026 data
          const live2026 = generateMockDataEuropean(2026);
          harmonizer.addLiveDataEuropean(live2026);
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
