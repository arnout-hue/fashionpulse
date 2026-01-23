import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { DateRange, DashboardFilters, Label, Channel, Platform } from '@/types';

interface DashboardState {
  // Filters
  filters: DashboardFilters;
  setDateRange: (range: DateRange) => void;
  setLabels: (labels: string[]) => void;
  setChannels: (channels: Channel[]) => void;
  setPlatforms: (platforms: Platform[]) => void;
  toggleYoY: () => void;
  toggleDayOfWeekAlign: () => void;
  resetFilters: () => void;
  
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

const defaultFilters: DashboardFilters = {
  dateRange: getDefaultDateRange(),
  labels: [], // Start empty, will be populated from sheet data
  channels: ['web', 'app'] as Channel[],
  platforms: ['facebook', 'google'] as Platform[],
  enableYoY: false,
  alignByDayOfWeek: true,
};

export const useDashboardStore = create<DashboardState>()(
  devtools(
    persist(
      (set) => ({
        filters: defaultFilters,
        
        setDateRange: (range) =>
          set((state) => ({
            filters: { ...state.filters, dateRange: range },
          })),
          
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
          
        resetFilters: () =>
          set({ filters: defaultFilters }),
          
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
