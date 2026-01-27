import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatPercentage } from '@/utils/analytics';

interface MetricCardProps {
  label: string;
  value: number;
  previousValue?: number;
  format?: 'currency' | 'number' | 'percentage' | 'multiplier';
  size?: 'sm' | 'md' | 'lg';
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function MetricCard({
  label,
  value,
  previousValue,
  format = 'currency',
  size = 'md',
  className,
}: MetricCardProps) {
  const formattedValue = React.useMemo(() => {
    switch (format) {
      case 'currency':
        return formatCurrency(value, size === 'lg');
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;
      case 'multiplier':
        return `${value.toFixed(2)}x`;
      default:
        return value.toLocaleString();
    }
  }, [value, format, size]);

  const change = previousValue ? ((value - previousValue) / previousValue) * 100 : 0;
  const trend = change > 1 ? 'up' : change < -1 ? 'down' : 'neutral';
  
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="metric-label">{label}</span>
      <motion.span
        key={value}
        initial={{ opacity: 0.5, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'tabular-nums font-bold tracking-tight',
          size === 'lg' && 'metric-value-lg',
          size === 'md' && 'metric-value',
          size === 'sm' && 'text-xl font-semibold'
        )}
      >
        {formattedValue}
      </motion.span>
      {previousValue !== undefined && (
        <div className="flex items-center gap-1.5 text-sm">
          <TrendIcon className={cn(
            'w-4 h-4',
            trend === 'up' && 'text-profit',
            trend === 'down' && 'text-spend',
            trend === 'neutral' && 'text-muted-foreground'
          )} />
          <span className="text-muted-foreground tabular-nums">
            {format === 'currency' ? formatCurrency(previousValue, size === 'lg') : previousValue.toLocaleString()}
          </span>
          <span className={cn(
            'font-medium tabular-nums',
            trend === 'up' && 'text-profit',
            trend === 'down' && 'text-spend',
            trend === 'neutral' && 'text-muted-foreground'
          )}>
            ({formatPercentage(change)})
          </span>
        </div>
      )}
    </div>
  );
}

interface StatusBadgeProps {
  status: 'positive' | 'negative' | 'neutral' | 'warning';
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border',
        status === 'positive' && 'status-positive',
        status === 'negative' && 'status-negative',
        status === 'neutral' && 'status-neutral',
        status === 'warning' && 'bg-warning-light text-warning border-warning/20',
        className
      )}
    >
      {children}
    </span>
  );
}

interface LiveIndicatorProps {
  className?: string;
}

export function LiveIndicator({ className }: LiveIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-profit opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-profit" />
      </span>
      <span className="text-xs font-medium text-muted-foreground">Live</span>
    </div>
  );
}
