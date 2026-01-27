import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/analytics';
import { useTranslation } from '@/hooks/useTranslation';
import type { PacingData } from '@/types';

interface PacingGaugeProps {
  pacing: PacingData;
  className?: string;
}

export const PacingGauge = forwardRef<HTMLDivElement, PacingGaugeProps>(
  ({ pacing, className }, ref) => {
    const { t, interpolate } = useTranslation();
    
    const progressPercent = Math.min(
      (pacing.currentRevenue / pacing.targetRevenue) * 100,
      100
    );
    
    return (
      <div ref={ref} className={cn('space-y-6', className)}>
        {/* Main Progress */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-sm text-muted-foreground">{t.gauges.currentRevenue}</p>
              <p className="metric-value-lg text-foreground">
                {formatCurrency(pacing.currentRevenue, true)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{t.gauges.target}</p>
              <p className="text-xl font-semibold text-muted-foreground">
                {formatCurrency(pacing.targetRevenue, true)}
              </p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="relative h-4 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="absolute inset-y-0 left-0 gauge-revenue rounded-full"
            />
            {/* Target marker */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-foreground/30"
              style={{ left: `${(pacing.daysPassed / pacing.daysInMonth) * 100}%` }}
            />
          </div>
          
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{interpolate(t.gauges.dayOfMonth, { current: pacing.daysPassed, total: pacing.daysInMonth })}</span>
            <span>{progressPercent.toFixed(1)}% {t.gauges.target.toLowerCase()}</span>
          </div>
        </div>
        
        {/* Projection */}
        <div className={cn(
          'p-4 rounded-xl border',
          pacing.onTrack ? 'bg-profit-light border-profit/20' : 'bg-warning-light border-warning/20'
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              pacing.onTrack ? 'bg-profit/20' : 'bg-warning/20'
            )}>
              <span className={cn(
                'text-lg font-bold',
                pacing.onTrack ? 'text-profit' : 'text-warning'
              )}>
                {pacing.projectedPercentage >= 100 ? '✓' : '!'}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">
                {t.gauges.projected}: {formatCurrency(pacing.projectedRevenue, true)}
              </p>
              <p className="text-sm text-muted-foreground">
                {pacing.projectedPercentage.toFixed(0)}% {t.gauges.target.toLowerCase()}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

PacingGauge.displayName = 'PacingGauge';

interface MERGaugeProps {
  value: number;
  status: 'excellent' | 'good' | 'warning' | 'danger';
  className?: string;
}

export const MERGauge = forwardRef<HTMLDivElement, MERGaugeProps>(
  ({ value, status, className }, ref) => {
    const { t } = useTranslation();
    
    const percentage = Math.min(value * 100, 40);
    const displayPercent = (percentage / 40) * 100;
    
    const statusColors = {
      excellent: 'bg-profit',
      good: 'bg-profit',
      warning: 'bg-warning',
      danger: 'bg-spend',
    };
    
    const statusLabels = {
      excellent: t.gauges.excellent,
      good: t.gauges.good,
      warning: t.gauges.warning,
      danger: t.gauges.high,
    };
    
    return (
      <div ref={ref} className={cn('space-y-4', className)}>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-muted-foreground">MER</p>
            <p className="metric-value">{(value * 100).toFixed(1)}%</p>
          </div>
          <span className={cn(
            'px-3 py-1 rounded-full text-sm font-medium',
            status === 'excellent' || status === 'good' ? 'bg-profit/10 text-profit' :
            status === 'warning' ? 'bg-warning/10 text-warning' :
            'bg-spend/10 text-spend'
          )}>
            {statusLabels[status]}
          </span>
        </div>
        
        {/* Gauge */}
        <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
          {/* Threshold markers */}
          <div className="absolute inset-0 flex">
            <div className="w-[37.5%] bg-profit/20" /> {/* 0-15% */}
            <div className="w-[12.5%] bg-profit/10" /> {/* 15-20% */}
            <div className="w-[12.5%] bg-warning/20" /> {/* 20-25% */}
            <div className="flex-1 bg-spend/20" /> {/* 25%+ */}
          </div>
          
          {/* Indicator */}
          <motion.div
            initial={{ left: 0 }}
            animate={{ left: `${displayPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={cn(
              'absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-lg',
              statusColors[status]
            )}
            style={{ marginLeft: '-8px' }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0%</span>
          <span>15%</span>
          <span>20%</span>
          <span>25%</span>
          <span>40%+</span>
        </div>
      </div>
    );
  }
);

MERGauge.displayName = 'MERGauge';
