import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { DateRange, DashboardFilters, Label, Channel, Platform, LABELS } from '@/types';

interface DashboardState {
  // Filters
  filters: DashboardFilters;
  setDateRange: (range: DateRange) => void;
  setLabels: (labels: Label[]) => void;
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
}

const getDefaultDateRange = (): DateRange => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start, end };
};

const defaultFilters: DashboardFilters = {
  dateRange: getDefaultDateRange(),
  labels: ['Fashionmusthaves', 'Jurkjes'] as Label[],
  channels: ['web', 'app'] as Channel[],
  platforms: ['facebook', 'google'] as Platform[],
  enableYoY: false,
  alignByDayOfWeek: true,
};

export const useDashboardStore = create<DashboardState>()(
  devtools(
    (set) => ({
      filters: defaultFilters,
      
      setDateRange: (range) =>
        set((state) => ({
          filters: { ...state.filters, dateRange: range },
        })),
        
      setLabels: (labels) =>
        set((state) => ({
          filters: { ...state.filters, labels },
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
    }),
    { name: 'dashboard-store' }
  )
);
