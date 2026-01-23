import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardStore } from '@/store/dashboardStore';
import { useFilteredData } from '@/hooks/useFashionData';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
}

export function DashboardHeader({ title, subtitle, onRefresh }: DashboardHeaderProps) {
  const { filters, setDateRange, toggleYoY, toggleDayOfWeekAlign, lastRefresh } = useDashboardStore();
  const [open, setOpen] = useState(false);
  
  const handleDateSelect = (range: DateRange | undefined) => {
    if (range?.from) {
      setDateRange({
        start: range.from,
        end: range.to || range.from,
      });
    }
  };
  
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
        
        <div className="flex items-center gap-4">
          {/* Date Range Picker */}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 bg-secondary border-0 hover:bg-secondary/80"
              >
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {format(filters.dateRange.start, 'MMM d')} - {format(filters.dateRange.end, 'MMM d, yyyy')}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 pointer-events-auto" align="end" sideOffset={8}>
              <Calendar
                mode="range"
                defaultMonth={filters.dateRange.start}
                selected={{
                  from: filters.dateRange.start,
                  to: filters.dateRange.end,
                }}
                onSelect={handleDateSelect}
                numberOfMonths={2}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          {/* YoY Toggle */}
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
            YoY Compare
          </Button>
          
          {/* Smart Align Toggle */}
          {filters.enableYoY && (
            <Button
              variant={filters.alignByDayOfWeek ? 'default' : 'outline'}
              size="sm"
              onClick={toggleDayOfWeekAlign}
              className="gap-2"
            >
              {filters.alignByDayOfWeek ? 'Smart Align' : 'Date Align'}
            </Button>
          )}
          
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
      
      {/* Last Updated */}
      {lastRefresh && (
        <p className="text-xs text-muted-foreground mt-3">
          Last updated: {format(lastRefresh, 'HH:mm:ss')}
        </p>
      )}
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
      // If unchecking, remove from selected
      const newLabels = filters.labels.filter((l) => l !== label);
      setLabels(newLabels as any);
    } else {
      // If checking, add to selected
      setLabels([...filters.labels, label] as any);
    }
  };
  
  const selectAll = () => {
    setLabels(availableLabels as any);
  };
  
  // If no labels available yet, show loading state
  if (!availableLabels || availableLabels.length === 0) {
    return (
      <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
        <span className="text-sm">Loading labels from sheet...</span>
      </div>
    );
  }
  
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {/* Select All Button */}
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
