import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, ToggleLeft, ToggleRight, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardStore } from '@/store/dashboardStore';
import { useFilteredData } from '@/hooks/useFashionData';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from './DateRangePicker';
import { format, subYears } from 'date-fns';
import type { DateRange } from 'react-day-picker';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
}

export function DashboardHeader({ title, subtitle, onRefresh }: DashboardHeaderProps) {
  const { filters, setDateRange, toggleYoY, toggleDayOfWeekAlign, lastRefresh } = useDashboardStore();
  
  const handleDateUpdate = (range: DateRange) => {
    if (range.from) {
      setDateRange({
        start: range.from,
        end: range.to || range.from,
      });
    }
  };

  const compareStart = subYears(filters.dateRange.start, 1);
  const compareEnd = subYears(filters.dateRange.end, 1);

  return (
    <header className="bg-card border-b border-border px-8 py-6">
      <div className="flex items-start justify-between">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-foreground"
          >
            {title}
          </motion.h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Date Range Picker with Presets */}
          <DateRangePicker
            date={{
              from: filters.dateRange.start,
              to: filters.dateRange.end,
            }}
            setDate={handleDateUpdate}
          />

          {/* YoY Toggle Group */}
          <div className="flex items-center gap-2">
            <Button
              variant={filters.enableYoY ? 'default' : 'outline'}
              size="sm"
              onClick={toggleYoY}
              className="gap-2"
            >
              {filters.enableYoY ? (
                <ToggleRight className="w-4 h-4" />
              ) : (
                <ToggleLeft className="w-4 h-4" />
              )}
              YoY {filters.enableYoY ? 'On' : 'Off'}
            </Button>
            
            {filters.enableYoY && (
              <Button
                variant={filters.alignByDayOfWeek ? 'default' : 'outline'}
                size="sm"
                onClick={toggleDayOfWeekAlign}
              >
                {filters.alignByDayOfWeek ? 'Smart Align' : 'Date Align'}
              </Button>
            )}
          </div>
          
          {/* Refresh Button */}
          {onRefresh && (
            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              className="relative"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Context Bar: Comparison Details & Last Updated */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
        <div className="flex items-center gap-2 text-sm">
          {filters.enableYoY && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="font-medium text-foreground">Comparing:</span>
              <span className="bg-secondary px-2 py-0.5 rounded text-foreground">
                {format(filters.dateRange.start, 'MMM d, yyyy')}
              </span>
              <ArrowRight className="w-3 h-3" />
              <span className="bg-secondary px-2 py-0.5 rounded text-foreground">
                {format(compareStart, 'MMM d, yyyy')}
              </span>
              <span className="text-xs italic">
                ({filters.alignByDayOfWeek ? 'Matched by Day of Week' : 'Exact Date Match'})
              </span>
            </div>
          )}
        </div>

        {lastRefresh && (
          <p className="text-xs text-muted-foreground">
            Last sync: {format(lastRefresh, 'HH:mm:ss')}
          </p>
        )}
      </div>
    </header>
  );
}

interface LabelFilterProps {
  className?: string;
}

export function LabelFilter({ className }: LabelFilterProps) {
  const { filters, setLabels } = useDashboardStore();
  const { availableLabels } = useFilteredData();
  
  const toggleLabel = (label: string) => {
    if (filters.labels.includes(label as any)) {
      const newLabels = filters.labels.filter((l) => l !== label);
      setLabels(newLabels as any);
    } else {
      setLabels([...filters.labels, label] as any);
    }
  };
  
  const selectAll = () => {
    setLabels(availableLabels as any);
  };
  
  if (!availableLabels || availableLabels.length === 0) {
    return (
      <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
        <span className="text-sm">Loading labels from sheet...</span>
      </div>
    );
  }
  
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={selectAll}
        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
      >
        All
      </motion.button>
      
      <div className="w-px h-6 bg-border" />
      
      {availableLabels.map((label) => {
        const isActive = filters.labels.includes(label as any);
        return (
          <motion.button
            key={label}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => toggleLabel(label)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
          >
            {label}
          </motion.button>
        );
      })}
    </div>
  );
}
