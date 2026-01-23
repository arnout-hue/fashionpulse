import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardStore } from '@/store/dashboardStore';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
}

export function DashboardHeader({ title, subtitle, onRefresh }: DashboardHeaderProps) {
  const { filters, toggleYoY, toggleDayOfWeekAlign, lastRefresh } = useDashboardStore();
  
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
          {/* Date Range Display */}
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {format(filters.dateRange.start, 'MMM d')} - {format(filters.dateRange.end, 'MMM d, yyyy')}
            </span>
          </div>
          
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
  const allLabels = ['Fashionmusthaves', 'Jurkjes', 'Trendwear', 'StyleHub', 'ChicCollection'];
  
  const toggleLabel = (label: string) => {
    if (filters.labels.includes(label as any)) {
      setLabels(filters.labels.filter((l) => l !== label) as any);
    } else {
      setLabels([...filters.labels, label] as any);
    }
  };
  
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {allLabels.map((label) => {
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
