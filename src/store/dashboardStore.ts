import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { subDays, subYears, differenceInDays } from 'date-fns';
import type { DateRange, DashboardFilters, Label, Channel, Platform, ComparisonMode } from '@/types';

interface DashboardState {
  // Filters
  filters: DashboardFilters;
  setDateRange: (range: DateRange) => void;
  setLabels: (labels: string[]) => void;
  setChannels: (channels: Channel[]) => void;
  setPlatforms: (platforms: Platform[]) => void;
  toggleYoY: () => void;
  toggleDayOfWeekAlign: () => void;
  setAlignByDayOfWeek: (align: boolean) => void;
  resetFilters: () => void;
  
  // Comparison
  setComparisonEnabled: (enabled: boolean) => void;
  setComparisonMode: (mode: ComparisonMode) => void;
  setComparisonRange: (range: DateRange | null) => void;
  
  // UI State
  selectedCard: string | null;
  setSelectedCard: (card: string | null) => void;
  
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  
  // Data freshness
  lastRefresh: Date | null;
  setLastRefresh: (date: Date) => void;
  
  // Google Sheet
  googleSheetId: string | null;
  setGoogleSheetId: (id: string | null) => void;
}

const getDefaultDateRange = (): DateRange => {
  // Default to current year start through end of current month
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1); // Jan 1 of current year
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of current month
  return { start, end };
};

// Calculate comparison range based on mode
function calculateComparisonRange(
  primary: DateRange,
  mode: ComparisonMode
): DateRange {
  const daysDiff = differenceInDays(primary.end, primary.start);
  
  switch (mode) {
    case 'previous_period':
      return {
        start: subDays(primary.start, daysDiff + 1),
        end: subDays(primary.start, 1),
      };
    case 'previous_year':
      return {
        start: subYears(primary.start, 1),
        end: subYears(primary.end, 1),
      };
    case 'custom':
    default:
      // For custom, keep existing range or calculate previous year as default
      return {
        start: subYears(primary.start, 1),
        end: subYears(primary.end, 1),
      };
  }
}

const defaultFilters: DashboardFilters = {
  dateRange: getDefaultDateRange(),
  labels: [], // Start empty, will be populated from sheet data
  channels: ['web', 'app'] as Channel[],
  platforms: ['facebook', 'google'] as Platform[],
  enableYoY: false,
  alignByDayOfWeek: true,
  comparisonEnabled: false,
  comparisonMode: 'previous_year',
  comparisonRange: null,
};

export const useDashboardStore = create<DashboardState>()(
  devtools(
    persist(
      (set, get) => ({
        filters: defaultFilters,
        
        setDateRange: (range) =>
          set((state) => {
            // Auto-update comparison range when primary changes
            const comparisonRange = state.filters.comparisonEnabled
              ? calculateComparisonRange(range, state.filters.comparisonMode)
              : state.filters.comparisonRange;
            
            return {
              filters: { ...state.filters, dateRange: range, comparisonRange },
            };
          }),
          
        setLabels: (labels) =>
          set((state) => ({
            filters: { ...state.filters, labels: labels as Label[] },
          })),
          
        setChannels: (channels) =>
          set((state) => ({
            filters: { ...state.filters, channels },
          })),
          
        setPlatforms: (platforms) =>
          set((state) => ({
            filters: { ...state.filters, platforms },
          })),
          
        toggleYoY: () =>
          set((state) => ({
            filters: { ...state.filters, enableYoY: !state.filters.enableYoY },
          })),
          
        toggleDayOfWeekAlign: () =>
          set((state) => ({
            filters: { ...state.filters, alignByDayOfWeek: !state.filters.alignByDayOfWeek },
          })),
        
        setAlignByDayOfWeek: (align) =>
          set((state) => ({
            filters: { ...state.filters, alignByDayOfWeek: align },
          })),
          
        resetFilters: () =>
          set({ filters: defaultFilters }),
        
        // Comparison methods
        setComparisonEnabled: (enabled) =>
          set((state) => {
            const comparisonRange = enabled
              ? calculateComparisonRange(state.filters.dateRange, state.filters.comparisonMode)
              : null;
            
            return {
              filters: { 
                ...state.filters, 
                comparisonEnabled: enabled, 
                comparisonRange,
                enableYoY: enabled, // Sync with legacy YoY toggle
              },
            };
          }),
          
        setComparisonMode: (mode) =>
          set((state) => {
            const comparisonRange = state.filters.comparisonEnabled
              ? calculateComparisonRange(state.filters.dateRange, mode)
              : null;
            
            return {
              filters: { ...state.filters, comparisonMode: mode, comparisonRange },
            };
          }),
          
        setComparisonRange: (range) =>
          set((state) => ({
            filters: { ...state.filters, comparisonRange: range },
          })),
          
        selectedCard: null,
        setSelectedCard: (card) => set({ selectedCard: card }),
        
        isLoading: false,
        setLoading: (loading) => set({ isLoading: loading }),
        
        lastRefresh: null,
        setLastRefresh: (date) => set({ lastRefresh: date }),
        
        googleSheetId: null,
        setGoogleSheetId: (id) => set({ googleSheetId: id }),
      }),
      {
        name: 'fashion-pulse-store',
        partialize: (state) => ({ 
          googleSheetId: state.googleSheetId,
          // Don't persist filters as date ranges become stale
        }),
      }
    ),
    { name: 'dashboard-store' }
  )
);
