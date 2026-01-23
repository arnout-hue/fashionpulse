import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Target,
  Smartphone,
  Monitor,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { BentoGrid, BentoCard, gridSpans } from '@/components/dashboard/BentoGrid';
import { MetricCard, StatusBadge } from '@/components/dashboard/MetricCard';
import { PacingGauge, MERGauge } from '@/components/dashboard/Gauges';
import { SmartTrendChart, ChannelSplitChart } from '@/components/charts/SmartTrendChart';
import { useFilteredData } from '@/hooks/useFashionData';
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
  
  // YoY comparison
  const yoyComparison = useMemo(() => {
    if (!filters.enableYoY) return undefined;
    
    const previousYearMetrics = aggregateByDate(
      allMetrics.filter((m) => new Date(m.date).getFullYear() === 2025)
    );
    
    return calculateYoYComparison(
      aggregatedMetrics,
      previousYearMetrics,
      filters.alignByDayOfWeek
    );
  }, [aggregatedMetrics, allMetrics, filters.enableYoY, filters.alignByDayOfWeek]);
  
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
            label="Total Revenue"
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
            label="Total Spend"
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
            label="Orders"
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
            <span className="metric-label">Contribution Margin</span>
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
          title="Month Pacing"
          subtitle="Revenue vs. Target"
          icon={<Target className="w-5 h-5" />}
          variant="hero"
          className={gridSpans.hero}
          action={
            pacing?.onTrack ? (
              <StatusBadge status="positive">On Track</StatusBadge>
            ) : (
              <StatusBadge status="warning">Below Pace</StatusBadge>
            )
          }
        >
          {pacing && <PacingGauge pacing={pacing} />}
        </BentoCard>
        
        {/* MER Gauge */}
        <BentoCard
          title="Marketing Efficiency"
          subtitle="Spend / Revenue Ratio"
          icon={<DollarSign className="w-5 h-5" />}
          className={gridSpans.medium}
        >
          <MERGauge value={merStatus.value} status={merStatus.status} />
        </BentoCard>
        
        {/* Channel Split */}
        <BentoCard
          title="Channel Split"
          subtitle="Web vs. App Revenue"
          icon={<Smartphone className="w-5 h-5" />}
          className={cn(gridSpans.tall, 'lg:col-start-4')}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-channel-web" />
                <span className="text-sm text-muted-foreground">Web</span>
                <span className="text-sm font-semibold tabular-nums">
                  {channelSplit.webPercentage.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-channel-app" />
                <span className="text-sm text-muted-foreground">App</span>
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
                  <span className="text-sm text-muted-foreground">Web Revenue</span>
                </div>
                <p className="text-lg font-semibold tabular-nums">
                  {formatCurrency(channelSplit.web, true)}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-channel-app" />
                  <span className="text-sm text-muted-foreground">App Revenue</span>
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
          title="Average Order Value"
          subtitle="Revenue per Order"
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
        title="The Pulse"
        subtitle="Daily Revenue Trend"
        icon={<TrendingUp className="w-5 h-5" />}
        action={
          filters.enableYoY && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-revenue rounded" />
                <span className="text-muted-foreground">2026</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-muted-foreground rounded border-dashed" />
                <span className="text-muted-foreground">2025</span>
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
