import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { DailyMetrics, MonthlyTarget, HarmonizedData } from '@/types';
import { DataHarmonizer, fetchGoogleSheetCSV } from '@/utils/dataHarmonizer';
import { useDashboardStore } from '@/store/dashboardStore';
import { toast } from '@/hooks/use-toast';

// ============================================
// DATA FETCHING HOOK (Google Sheet Only)
// ============================================

interface UseFashionDataOptions {
  staleTime?: number;
}

export function useFashionData(options: UseFashionDataOptions = {}) {
  const { staleTime = 5 * 60 * 1000 } = options;
  const setLoading = useDashboardStore((s) => s.setLoading);
  const setLastRefresh = useDashboardStore((s) => s.setLastRefresh);
  
  const query = useQuery({
    queryKey: ['fashion-data'],
    queryFn: async (): Promise<HarmonizedData> => {
      setLoading(true);
      
      const harmonizer = new DataHarmonizer();
      
      try {
        console.log('Fetching Google Sheet via Edge Function...');
        // Sheet ID is handled server-side by the edge function
        const liveData = await fetchGoogleSheetCSV('', 'Daily_Input');
        console.log('Fetched rows:', liveData.length, 'Sample:', liveData[0]);
        
        // Use European format parser for Google Sheet data
        const result = harmonizer.addLiveDataEuropean(liveData);
        
        if (result.errors > 0) {
          toast({
            title: 'Data Warning',
            description: `${result.errors} rows had parsing issues. Check console for details.`,
            variant: 'destructive',
          });
        } else if (result.success > 0) {
          toast({
            title: 'Data Loaded',
            description: `Successfully loaded ${result.success} rows from Google Sheet`,
          });
        }
        
        // Fetch targets from Targets tab if available
        try {
          const targetsData = await fetchGoogleSheetCSV('', 'Targets');
          if (targetsData.length > 0) {
            harmonizer.addTargets(targetsData);
          }
        } catch {
          console.log('No Targets tab found (optional)');
        }
        
        const errors = harmonizer.getErrors();
        if (errors.length > 0) {
          console.warn('Data harmonization warnings:', errors);
        }
        
        const data = harmonizer.harmonize(false);
        setLastRefresh(data.lastUpdated);
        
        return data;
      } finally {
        setLoading(false);
      }
    },
    staleTime,
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
  
  return query;
}

// ============================================
// FILTERED DATA HOOK
// ============================================

export function useFilteredData() {
  const { data: harmonizedData, ...queryState } = useFashionData();
  const filters = useDashboardStore((s) => s.filters);
  
  // Get unique labels from the actual data
  const availableLabels = useMemo(() => {
    if (!harmonizedData) return [];
    return [...new Set(harmonizedData.metrics.map((m) => m.label))];
  }, [harmonizedData]);
  
  const filteredMetrics = useMemo(() => {
    if (!harmonizedData) return [];
    
    let metrics = harmonizedData.metrics;
    
    // Filter by date range
    metrics = metrics.filter((m) => {
      const date = new Date(m.date);
      return date >= filters.dateRange.start && date <= filters.dateRange.end;
    });
    
    // Filter by labels ONLY if user has selected specific labels
    // If no labels selected, show all data
    if (filters.labels.length > 0) {
      const validLabels = filters.labels.filter(l => availableLabels.includes(l as string));
      if (validLabels.length > 0) {
        metrics = metrics.filter((m) => validLabels.includes(m.label as any));
      }
    }
    
    return metrics;
  }, [harmonizedData, filters.dateRange, filters.labels, availableLabels]);
  
  const currentTarget = useMemo(() => {
    if (!harmonizedData) return null;
    
    // Use filter end date instead of today for dynamic target lookup
    const targetDate = filters.dateRange.end;
    const monthStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
    
    console.log('Looking for target month:', monthStr, 'Available targets:', harmonizedData.targets.map(t => t.month));
    
    // If there are targets, use them
    if (harmonizedData.targets.length > 0) {
      const relevantTargets = harmonizedData.targets.filter((t) => t.month === monthStr);
      console.log('Found matching targets:', relevantTargets);
      
      if (relevantTargets.length > 0) {
        return {
          month: monthStr,
          label: 'Combined',
          revenueTarget: relevantTargets.reduce((sum, t) => sum + t.revenueTarget, 0),
          ordersTarget: relevantTargets.reduce((sum, t) => sum + t.ordersTarget, 0),
          merTarget: relevantTargets[0].merTarget,
        };
      }
    }
    
    // Return null if no matching target found - don't use fake €100K fallback
    return null;
  }, [harmonizedData, filters.dateRange]);
  
  // Calculate total revenue for ALL labels within the date range (no label filter)
  const totalRevenueAllLabels = useMemo(() => {
    if (!harmonizedData) return 0;
    
    const metricsInDateRange = harmonizedData.metrics.filter((m) => {
      const date = new Date(m.date);
      return date >= filters.dateRange.start && date <= filters.dateRange.end;
    });
    
    return metricsInDateRange.reduce((sum, m) => sum + m.totalRevenue, 0);
  }, [harmonizedData, filters.dateRange]);
  
  return {
    metrics: filteredMetrics,
    target: currentTarget,
    allMetrics: harmonizedData?.metrics || [],
    allTargets: harmonizedData?.targets || [],
    availableLabels,
    totalRevenueAllLabels,
    ...queryState,
  };
}
