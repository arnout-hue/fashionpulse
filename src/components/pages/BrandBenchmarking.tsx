import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, DollarSign } from 'lucide-react';
import { BentoCard } from '@/components/dashboard/BentoGrid';
import { BrandPodium } from '@/components/charts/BrandPodium';
import { useFilteredData } from '@/hooks/useFashionData';
import { useDashboardStore } from '@/store/dashboardStore';
import { useTranslation } from '@/hooks/useTranslation';
import {
  calculateBrandBenchmarks,
  formatCurrency,
  formatROAS,
  formatPercentage,
} from '@/utils/analytics';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export function BrandBenchmarking() {
  const { metrics, allMetrics } = useFilteredData();
  const { filters } = useDashboardStore();
  const { t } = useTranslation();

  // Calculate Comparison Metrics (same logic as RevenueDeepDive)
  const previousMetrics = useMemo(() => {
    const currentYear = filters.dateRange.start.getFullYear();
    let rangeStart: Date, rangeEnd: Date;

    if (filters.comparisonEnabled && filters.comparisonRange) {
      rangeStart = new Date(filters.comparisonRange.start);
      rangeEnd = new Date(filters.comparisonRange.end);
    } else {
      // Previous Year fallback
      rangeStart = new Date(filters.dateRange.start);
      rangeStart.setFullYear(currentYear - 1);
      rangeEnd = new Date(filters.dateRange.end);
      rangeEnd.setFullYear(currentYear - 1);
    }

    // Filter allMetrics for this range and apply same label filters
    return allMetrics.filter((m) => {
      const d = new Date(m.date);
      const inRange = d >= rangeStart && d <= rangeEnd;
      const matchesLabels =
        filters.labels.length === 0 || filters.labels.includes(m.label);
      return inRange && matchesLabels;
    });
  }, [allMetrics, filters]);

  // Generate Benchmarks
  const benchmarkData = useMemo(() => {
    return calculateBrandBenchmarks(metrics, previousMetrics);
  }, [metrics, previousMetrics]);

  // Find Winners
  const topRevenue = benchmarkData[0]; // Already sorted by revenue
  const topRoas = [...benchmarkData].sort((a, b) => b.roas - a.roas)[0];
  const topGrowth = [...benchmarkData].sort(
    (a, b) => b.growthPercentage - a.growthPercentage
  )[0];

  const tt = t.brandBenchmarking;

  return (
    <div className="p-8 space-y-6">
      {/* Header Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topRevenue && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
            className="bg-card rounded-xl border border-border p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">
                  {tt?.topRevenue || 'Top Revenue'}
                </p>
                <p className="text-lg font-bold text-foreground mt-1">
                  {topRevenue.label}
                </p>
                <p className="text-2xl font-bold text-primary mt-2">
                  {formatCurrency(topRevenue.revenue)}
                </p>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </div>
          </motion.div>
        )}

        {topRoas && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-xl border border-border p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">
                  {tt?.bestRoas || 'Best ROAS'}
                </p>
                <p className="text-lg font-bold text-foreground mt-1">
                  {topRoas.label}
                </p>
                <p className="text-2xl font-bold text-profit mt-2">
                  {formatROAS(topRoas.roas)}
                </p>
              </div>
              <div className="p-3 bg-profit/10 rounded-xl">
                <Trophy className="w-6 h-6 text-profit" />
              </div>
            </div>
          </motion.div>
        )}

        {topGrowth && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-xl border border-border p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">
                  {tt?.highestGrowth || 'Highest Growth'}
                </p>
                <p className="text-lg font-bold text-foreground mt-1">
                  {topGrowth.label}
                </p>
                <p
                  className={cn(
                    'text-2xl font-bold mt-2',
                    topGrowth.growthPercentage >= 0
                      ? 'text-profit'
                      : 'text-spend'
                  )}
                >
                  {formatPercentage(topGrowth.growthPercentage)}
                </p>
              </div>
              <div className="p-3 bg-chart-3/10 rounded-xl">
                <TrendingUp className="w-6 h-6 text-chart-3" />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* The Podium */}
      <BentoCard
        title={tt?.thePodium || 'The Podium'}
        icon={<Trophy className="w-5 h-5" />}
        className="min-h-[500px]"
      >
        <div className="mt-4">
          <BrandPodium data={benchmarkData} />
        </div>
      </BentoCard>

      {/* Detailed Table */}
      <BentoCard title={tt?.detailedBreakdown || 'Detailed Breakdown'}>
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tt?.brand || 'Brand'}</TableHead>
                <TableHead className="text-right">
                  {tt?.revenue || 'Revenue'}
                </TableHead>
                <TableHead className="text-right">
                  {tt?.spend || 'Spend'}
                </TableHead>
                <TableHead className="text-right">
                  {tt?.roas || 'ROAS'}
                </TableHead>
                <TableHead className="text-right">
                  {tt?.orders || 'Orders'}
                </TableHead>
                <TableHead className="text-right">
                  {tt?.aov || 'AOV'}
                </TableHead>
                <TableHead className="text-right">
                  {tt?.growth || 'Growth'}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {benchmarkData.map((d) => (
                <TableRow key={d.label}>
                  <TableCell className="font-medium">{d.label}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(d.revenue)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(d.spend)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right tabular-nums font-medium',
                      d.roas >= 5 ? 'text-profit' : ''
                    )}
                  >
                    {formatROAS(d.roas)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {d.orders.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(d.aov)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right tabular-nums font-medium',
                      d.growthPercentage >= 0 ? 'text-profit' : 'text-spend'
                    )}
                  >
                    {formatPercentage(d.growthPercentage)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </BentoCard>
    </div>
  );
}
