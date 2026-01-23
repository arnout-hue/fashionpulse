import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Target,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { BentoGrid, BentoCard, gridSpans } from '@/components/dashboard/BentoGrid';
import { MetricCard, StatusBadge } from '@/components/dashboard/MetricCard';
import { PacingGauge, MERGauge } from '@/components/dashboard/Gauges';
import { SmartTrendChart } from '@/components/charts/SmartTrendChart';
import { useFilteredData } from '@/hooks/useFashionData';
import { useTranslation } from '@/hooks/useTranslation';
import { 
  calculatePacing, 
  calculateMERStatus, 
  calculateChannelSplit,
  aggregateByDate,
  formatChartData,
  formatCurrency,
  calculateYoYComparison,
} from '@/utils/analytics';
import { useDashboardStore } from '@/store/dashboardStore';
import { cn } from '@/lib/utils';

export function CommandCenter() {
  const { metrics, target, allMetrics } = useFilteredData();
  const { filters } = useDashboardStore();
  const { t } = useTranslation();
  
  // Aggregate data by date
  const aggregatedMetrics = useMemo(() => {
    return aggregateByDate(metrics);
  }, [metrics]);
  
  // Calculate pacing
  const pacing = useMemo(() => {
    if (!target) return null;
    return calculatePacing(metrics, target);
  }, [metrics, target]);
  
  // Calculate MER
  const merStatus = useMemo(() => {
    return calculateMERStatus(metrics);
  }, [metrics]);
  
  // Calculate channel split
  const channelSplit = useMemo(() => {
    return calculateChannelSplit(metrics);
  }, [metrics]);
  
  // Calculate dynamic years for labels
  const currentYear = filters.dateRange.start.getFullYear();
  const comparisonYear = filters.comparisonRange 
    ? filters.comparisonRange.start.getFullYear()
    : currentYear - 1;
  
  // YoY comparison - now dynamic based on comparison range
  const yoyComparison = useMemo(() => {
    if (!filters.enableYoY && !filters.comparisonEnabled) return undefined;
    
    let previousYearMetrics;
    
    // Use comparison range if set
    if (filters.comparisonEnabled && filters.comparisonRange) {
      // Normalize comparison range to start/end of day to avoid time component issues
      const rangeStart = new Date(filters.comparisonRange.start);
      rangeStart.setHours(0, 0, 0, 0);
      
      const rangeEnd = new Date(filters.comparisonRange.end);
      rangeEnd.setHours(23, 59, 59, 999);
      
      previousYearMetrics = aggregateByDate(
        allMetrics.filter((m) => {
          const d = new Date(m.date);
          d.setHours(12, 0, 0, 0); // Normalize to midday to avoid edge cases
          return d >= rangeStart && d <= rangeEnd;
        })
      );
    } else {
      // Fallback: calculate previous year dynamically
      const previousYear = currentYear - 1;
      previousYearMetrics = aggregateByDate(
        allMetrics.filter((m) => new Date(m.date).getFullYear() === previousYear)
      );
    }
    
    return calculateYoYComparison(
      aggregatedMetrics,
      previousYearMetrics,
      filters.alignByDayOfWeek
    );
  }, [aggregatedMetrics, allMetrics, filters.enableYoY, filters.alignByDayOfWeek, filters.comparisonEnabled, filters.comparisonRange, currentYear]);
  
  // Chart data
  const chartData = useMemo(() => {
    return formatChartData(aggregatedMetrics, yoyComparison);
  }, [aggregatedMetrics, yoyComparison]);
  
  // Summary stats
  const totals = useMemo(() => {
    return {
      revenue: metrics.reduce((sum, m) => sum + m.totalRevenue, 0),
      spend: metrics.reduce((sum, m) => sum + m.totalSpend, 0),
      orders: metrics.reduce((sum, m) => sum + m.orders, 0),
      margin: metrics.reduce((sum, m) => sum + m.contributionMargin, 0),
    };
  }, [metrics]);
  
  // Previous period stats for comparison
  const previousTotals = useMemo(() => {
    if (!yoyComparison) return undefined;
    const prev = yoyComparison.previousPeriod;
    return {
      revenue: prev.reduce((sum, m) => sum + m.totalRevenue, 0),
      spend: prev.reduce((sum, m) => sum + m.totalSpend, 0),
      orders: prev.reduce((sum, m) => sum + m.orders, 0),
    };
  }, [yoyComparison]);
  
  return (
    <div className="p-8 space-y-6">
      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bento-card-sm"
        >
          <MetricCard
            label={t.commandCenter.totalRevenue}
            value={totals.revenue}
            previousValue={previousTotals?.revenue}
            format="currency"
            size="md"
          />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bento-card-sm"
        >
          <MetricCard
            label={t.commandCenter.totalSpend}
            value={totals.spend}
            previousValue={previousTotals?.spend}
            format="currency"
            size="md"
          />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bento-card-sm"
        >
          <MetricCard
            label={t.commandCenter.orders}
            value={totals.orders}
            previousValue={previousTotals?.orders}
            format="number"
            size="md"
          />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bento-card-sm"
        >
          <div className="flex flex-col gap-1">
            <span className="metric-label">{t.commandCenter.contributionMargin}</span>
            <span className={cn(
              'metric-value',
              totals.margin >= 0 ? 'text-profit' : 'text-spend'
            )}>
              {formatCurrency(totals.margin, true)}
            </span>
          </div>
        </motion.div>
      </div>
      
      {/* Main Bento Grid */}
      <BentoGrid>
        {/* Hero: Month Pacing */}
        <BentoCard
          title={t.commandCenter.monthPacing}
          subtitle={t.commandCenter.dailyRunRate}
          icon={<Target className="w-5 h-5" />}
          variant="hero"
          className={gridSpans.hero}
          action={
            pacing?.onTrack ? (
              <StatusBadge status="positive">{t.commandCenter.onTrack}</StatusBadge>
            ) : (
              <StatusBadge status="warning">{t.commandCenter.belowPace}</StatusBadge>
            )
          }
        >
          {pacing && <PacingGauge pacing={pacing} />}
        </BentoCard>
        
        {/* MER Gauge */}
        <BentoCard
          title={t.commandCenter.marketingEfficiency}
          subtitle={t.commandCenter.merVsTarget}
          icon={<DollarSign className="w-5 h-5" />}
          className={gridSpans.medium}
        >
          <MERGauge value={merStatus.value} status={merStatus.status} />
        </BentoCard>
        
        {/* Channel Split */}
        <BentoCard
          title={t.commandCenter.channelSplit}
          subtitle={t.commandCenter.webVsApp}
          icon={<Smartphone className="w-5 h-5" />}
          className={cn(gridSpans.tall, 'lg:col-start-4')}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-channel-web" />
                <span className="text-sm text-muted-foreground">{t.commandCenter.web}</span>
                <span className="text-sm font-semibold tabular-nums">
                  {channelSplit.webPercentage.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-channel-app" />
                <span className="text-sm text-muted-foreground">{t.commandCenter.app}</span>
                <span className="text-sm font-semibold tabular-nums">
                  {channelSplit.appPercentage.toFixed(1)}%
                </span>
              </div>
            </div>
            
            {/* Stacked Progress Bar */}
            <div className="relative h-8 bg-secondary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${channelSplit.webPercentage}%` }}
                transition={{ duration: 0.8 }}
                className="absolute inset-y-0 left-0 bg-channel-web"
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${channelSplit.appPercentage}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="absolute inset-y-0 bg-channel-app"
                style={{ left: `${channelSplit.webPercentage}%` }}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-channel-web" />
                  <span className="text-sm text-muted-foreground">{t.commandCenter.web}</span>
                </div>
                <p className="text-lg font-semibold tabular-nums">
                  {formatCurrency(channelSplit.web, true)}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-channel-app" />
                  <span className="text-sm text-muted-foreground">{t.commandCenter.app}</span>
                </div>
                <p className="text-lg font-semibold tabular-nums">
                  {formatCurrency(channelSplit.app, true)}
                </p>
              </div>
            </div>
          </div>
        </BentoCard>
        
        {/* AOV Card */}
        <BentoCard
          title={t.commandCenter.averageOrderValue}
          subtitle={t.commandCenter.aovTrend}
          icon={<ShoppingCart className="w-5 h-5" />}
          className={gridSpans.medium}
        >
          <div className="mt-4">
            <MetricCard
              label="AOV"
              value={totals.orders > 0 ? totals.revenue / totals.orders : 0}
              format="currency"
              size="lg"
            />
          </div>
        </BentoCard>
      </BentoGrid>
      
      {/* Revenue Pulse Chart (Full Width) */}
      <BentoCard
        title={t.commandCenter.thePulse}
        subtitle={t.commandCenter.dailyRevenueTrend}
        icon={<TrendingUp className="w-5 h-5" />}
        action={
          (filters.enableYoY || filters.comparisonEnabled) && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-revenue rounded" />
                <span className="text-muted-foreground">{currentYear}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-muted-foreground rounded border-dashed" />
                <span className="text-muted-foreground">{comparisonYear}</span>
              </div>
            </div>
          )
        }
      >
        <SmartTrendChart 
          data={chartData} 
          showYoY={filters.enableYoY}
          height={350}
        />
      </BentoCard>
    </div>
  );
}
