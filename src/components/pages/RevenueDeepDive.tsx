import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  Layers,
} from 'lucide-react';
import { BentoCard } from '@/components/dashboard/BentoGrid';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { SmartTrendChart, VarianceChart } from '@/components/charts/SmartTrendChart';
import { useFilteredData } from '@/hooks/useFashionData';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguageStore } from '@/store/languageStore';
import { 
  aggregateByDate,
  formatChartData,
  calculateYoYComparison,
  formatCurrency,
  formatPercentage,
} from '@/utils/analytics';
import { useDashboardStore } from '@/store/dashboardStore';
import { cn } from '@/lib/utils';

export function RevenueDeepDive() {
  const { metrics, allMetrics } = useFilteredData();
  const { filters } = useDashboardStore();
  const { t } = useTranslation();
  const { language } = useLanguageStore();
  
  const locale = language === 'nl' ? 'nl-NL' : 'en-US';
  
  const aggregatedMetrics = useMemo(() => {
    return aggregateByDate(metrics);
  }, [metrics]);
  
  // Dynamic comparison: use comparison range from store, or fallback to previous year
  const previousYearMetrics = useMemo(() => {
    // If comparison range is set, use it
    if (filters.comparisonEnabled && filters.comparisonRange) {
      // Normalize comparison range to start/end of day to avoid time component issues
      const rangeStart = new Date(filters.comparisonRange.start);
      rangeStart.setHours(0, 0, 0, 0);
      
      const rangeEnd = new Date(filters.comparisonRange.end);
      rangeEnd.setHours(23, 59, 59, 999);
      
      return aggregateByDate(
        allMetrics.filter((m) => {
          const d = new Date(m.date);
          d.setHours(12, 0, 0, 0); // Normalize to midday to avoid edge cases
          return d >= rangeStart && d <= rangeEnd;
        })
      );
    }
    
    // Fallback: calculate previous year dynamically from selected range
    const currentYear = filters.dateRange.start.getFullYear();
    const previousYear = currentYear - 1;
    
    return aggregateByDate(
      allMetrics.filter((m) => new Date(m.date).getFullYear() === previousYear)
    );
  }, [allMetrics, filters.dateRange, filters.comparisonEnabled, filters.comparisonRange]);
  
  // Calculate dynamic years for labels
  const currentYear = filters.dateRange.start.getFullYear();
  const comparisonYear = filters.comparisonRange 
    ? filters.comparisonRange.start.getFullYear()
    : currentYear - 1;
  
  const yoyComparison = useMemo(() => {
    return calculateYoYComparison(
      aggregatedMetrics,
      previousYearMetrics,
      filters.alignByDayOfWeek
    );
  }, [aggregatedMetrics, previousYearMetrics, filters.alignByDayOfWeek]);
  
  const chartData = useMemo(() => {
    return formatChartData(aggregatedMetrics, yoyComparison);
  }, [aggregatedMetrics, yoyComparison]);
  
  const varianceData = useMemo(() => {
    return yoyComparison.variance.map((v) => ({
      date: v.date.toISOString(),
      displayDate: v.date.toLocaleDateString(locale, { month: 'short', day: 'numeric' }),
      variance: v.revenueVariance,
    }));
  }, [yoyComparison, locale]);
  
  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalCurrentRevenue = yoyComparison.variance.reduce(
      (sum, v) => sum + v.currentRevenue, 0
    );
    const totalPreviousRevenue = yoyComparison.variance.reduce(
      (sum, v) => sum + v.previousRevenue, 0
    );
    const totalVariance = totalCurrentRevenue - totalPreviousRevenue;
    const variancePercent = totalPreviousRevenue > 0 
      ? (totalVariance / totalPreviousRevenue) * 100 
      : 0;
    
    const positiveDays = yoyComparison.variance.filter(v => v.revenueVariance > 0).length;
    const negativeDays = yoyComparison.variance.filter(v => v.revenueVariance < 0).length;
    
    const bestDay = [...yoyComparison.variance].sort(
      (a, b) => b.revenueVariance - a.revenueVariance
    )[0];
    const worstDay = [...yoyComparison.variance].sort(
      (a, b) => a.revenueVariance - b.revenueVariance
    )[0];
    
    return {
      totalCurrentRevenue,
      totalPreviousRevenue,
      totalVariance,
      variancePercent,
      positiveDays,
      negativeDays,
      bestDay,
      worstDay,
    };
  }, [yoyComparison]);
  
  return (
    <div className="p-8 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bento-card"
        >
          <MetricCard
            label={`${currentYear} ${t.charts.revenue}`}
            value={summaryStats.totalCurrentRevenue}
            format="currency"
            size="md"
          />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bento-card"
        >
          <MetricCard
            label={`${comparisonYear} ${t.charts.revenue}`}
            value={summaryStats.totalPreviousRevenue}
            format="currency"
            size="md"
          />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bento-card"
        >
          <div className="flex flex-col gap-1">
            <span className="metric-label">{t.revenueDeepDive.yoyVariance}</span>
            <span className={cn(
              'metric-value',
              summaryStats.totalVariance >= 0 ? 'text-profit' : 'text-spend'
            )}>
              {summaryStats.totalVariance >= 0 ? '+' : ''}
              {formatCurrency(summaryStats.totalVariance, true)}
            </span>
            <span className={cn(
              'text-sm font-medium',
              summaryStats.variancePercent >= 0 ? 'text-profit' : 'text-spend'
            )}>
              {formatPercentage(summaryStats.variancePercent)}
            </span>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bento-card"
        >
          <div className="space-y-3">
            <span className="metric-label">{t.revenueDeepDive.winLossDays}</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-profit" />
                <span className="text-xl font-bold text-profit">{summaryStats.positiveDays}</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-spend" />
                <span className="text-xl font-bold text-spend">{summaryStats.negativeDays}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Main Trend Chart */}
      <BentoCard
        title={t.revenueDeepDive.revenueTrend}
        subtitle={t.revenueDeepDive.comparingCurrentVsPrior}
        icon={<Layers className="w-5 h-5" />}
      >
        <SmartTrendChart 
          data={chartData} 
          showYoY={true}
          height={350}
        />
      </BentoCard>
      
      {/* Delta/Variance Chart */}
      <BentoCard
        title={t.revenueDeepDive.deltaView}
        subtitle={t.revenueDeepDive.dailyVarianceAnalysis}
        icon={<BarChart3 className="w-5 h-5" />}
      >
        <VarianceChart data={varianceData} height={200} />
      </BentoCard>
      
      {/* Best and Worst Days */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BentoCard
          title={t.revenueDeepDive.bestPerformingDay}
          subtitle={t.revenueDeepDive.vsLastYear}
          icon={<TrendingUp className="w-5 h-5 text-profit" />}
        >
          {summaryStats.bestDay && (
            <div className="space-y-3 mt-4">
              <p className="text-lg font-medium">
                {summaryStats.bestDay.date.toLocaleDateString(locale, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{currentYear} {t.charts.revenue}</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(summaryStats.bestDay.currentRevenue)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.charts.variance}</p>
                  <p className="text-xl font-bold text-profit">
                    +{formatCurrency(summaryStats.bestDay.revenueVariance)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </BentoCard>
        
        <BentoCard
          title={t.revenueDeepDive.worstPerformingDay}
          subtitle={t.revenueDeepDive.vsLastYear}
          icon={<TrendingDown className="w-5 h-5 text-spend" />}
        >
          {summaryStats.worstDay && (
            <div className="space-y-3 mt-4">
              <p className="text-lg font-medium">
                {summaryStats.worstDay.date.toLocaleDateString(locale, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{currentYear} {t.charts.revenue}</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(summaryStats.worstDay.currentRevenue)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.charts.variance}</p>
                  <p className="text-xl font-bold text-spend">
                    {formatCurrency(summaryStats.worstDay.revenueVariance)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </BentoCard>
      </div>
    </div>
  );
}
