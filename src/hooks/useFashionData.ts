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
  const googleSheetId = useDashboardStore((s) => s.googleSheetId);
  
  const query = useQuery({
    queryKey: ['fashion-data', googleSheetId],
    queryFn: async (): Promise<HarmonizedData> => {
      if (!googleSheetId) {
        throw new Error('No Google Sheet connected. Please add your Sheet ID in Settings.');
      }
      
      setLoading(true);
      
      const harmonizer = new DataHarmonizer();
      
      try {
        console.log('Fetching Google Sheet:', googleSheetId);
        const liveData = await fetchGoogleSheetCSV(googleSheetId, 'Daily_Input');
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
          const targetsData = await fetchGoogleSheetCSV(googleSheetId, 'Targets');
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
    enabled: !!googleSheetId,
    retry: 1,
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
    
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // If there are targets, use them
    if (harmonizedData.targets.length > 0) {
      const relevantTargets = harmonizedData.targets.filter((t) => t.month === monthStr);
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
    
    // Default target based on current data
    const totalRevenue = filteredMetrics.reduce((sum, m) => sum + m.totalRevenue, 0);
    return {
      month: monthStr,
      label: 'All',
      revenueTarget: Math.max(totalRevenue * 1.2, 100000),
      ordersTarget: 5000,
      merTarget: 0.20,
    };
  }, [harmonizedData, filteredMetrics]);
  
  return {
    metrics: filteredMetrics,
    target: currentTarget,
    allMetrics: harmonizedData?.metrics || [],
    allTargets: harmonizedData?.targets || [],
    availableLabels,
    ...queryState,
  };
}
