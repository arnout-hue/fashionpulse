import type { 
  DailyMetrics, 
  DataRowRaw, 
  MonthlyTarget, 
  MonthlyTargetRaw,
  PacingData,
  MERStatus,
  ChannelSplit,
  PlatformComparison,
  YoYComparison,
  ChartDataPoint,
  DateRange,
} from '@/types';

// ============================================
// DATE UTILITIES
// ============================================

/**
 * Get the week of month for a given date (1-5)
 */
export function getWeekOfMonth(date: Date): number {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayOfWeek = firstDay.getDay();
  const dayOfMonth = date.getDate();
  return Math.ceil((dayOfMonth + firstDayOfWeek) / 7);
}

/**
 * Get days in a month
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Get the Nth occurrence of a weekday in a month
 * e.g., 2nd Monday of November 2025
 */
export function getNthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  n: number
): Date | null {
  const firstDay = new Date(year, month, 1);
  let count = 0;
  
  for (let day = 1; day <= getDaysInMonth(year, month); day++) {
    const date = new Date(year, month, day);
    if (date.getDay() === weekday) {
      count++;
      if (count === n) {
        return date;
      }
    }
  }
  
  return null;
}

/**
 * Align dates by day of week for YoY comparison
 * Returns the equivalent date from the previous year based on weekday position
 */
export function alignDateByDayOfWeek(currentDate: Date): Date {
  const weekday = currentDate.getDay();
  const weekOfMonth = getWeekOfMonth(currentDate);
  
  const previousYear = currentDate.getFullYear() - 1;
  const month = currentDate.getMonth();
  
  const alignedDate = getNthWeekdayOfMonth(previousYear, month, weekday, weekOfMonth);
  
  // Fallback to same date if alignment fails
  if (!alignedDate) {
    return new Date(previousYear, month, currentDate.getDate());
  }
  
  return alignedDate;
}

/**
 * Format date for display
 */
export function formatDate(date: Date, format: 'short' | 'long' | 'iso' = 'short'): string {
  switch (format) {
    case 'iso':
      return date.toISOString().split('T')[0];
    case 'long':
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    default:
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
  }
}

// ============================================
// DATA TRANSFORMATION
// ============================================

/**
 * Transform raw data row to DailyMetrics
 */
export function transformToMetrics(row: DataRowRaw): DailyMetrics {
  const date = new Date(row.Date);
  const totalRevenue = row.Rev_Web + row.Rev_App;
  const totalSpend = row.Spend_FB + row.Spend_Google;
  const totalClicks = row.Clicks_FB + row.Clicks_Google;
  
  return {
    date,
    dateString: row.Date,
    label: row.Label,
    
    revenueWeb: row.Rev_Web,
    revenueApp: row.Rev_App,
    totalRevenue,
    
    orders: row.Orders,
    aov: row.Orders > 0 ? totalRevenue / row.Orders : 0,
    
    spendFB: row.Spend_FB,
    spendGoogle: row.Spend_Google,
    totalSpend,
    
    clicksFB: row.Clicks_FB,
    clicksGoogle: row.Clicks_Google,
    totalClicks,
    
    mer: totalRevenue > 0 ? totalSpend / totalRevenue : 0,
    contributionMargin: totalRevenue - totalSpend,
    roasFB: row.Spend_FB > 0 ? row.Rev_Web * 0.6 / row.Spend_FB : 0, // Estimated attribution
    roasGoogle: row.Spend_Google > 0 ? row.Rev_Web * 0.4 / row.Spend_Google : 0,
    
    dayOfWeek: date.getDay(),
    weekOfMonth: getWeekOfMonth(date),
    monthDay: date.getDate(),
  };
}

/**
 * Transform raw target to MonthlyTarget
 */
export function transformToTarget(row: MonthlyTargetRaw): MonthlyTarget {
  return {
    month: row.Month,
    label: row.Label,
    revenueTarget: row.Revenue_Target,
    ordersTarget: row.Orders_Target,
    merTarget: row.MER_Target,
  };
}

// ============================================
// ANALYTICS CALCULATIONS
// ============================================

/**
 * Calculate pacing against monthly target
 */
export function calculatePacing(
  metrics: DailyMetrics[],
  target: MonthlyTarget,
  referenceDate?: Date
): PacingData {
  const now = referenceDate || new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  const daysInMonth = getDaysInMonth(year, month);
  const daysPassed = now.getDate();
  
  const currentRevenue = metrics
    .filter((m) => {
      const d = new Date(m.date);
      return d.getMonth() === month && d.getFullYear() === year;
    })
    .reduce((sum, m) => sum + m.totalRevenue, 0);
  
  const dailyRate = daysPassed > 0 ? currentRevenue / daysPassed : 0;
  const projectedRevenue = dailyRate * daysInMonth;
  
  const pacingPercentage = target.revenueTarget > 0 
    ? (currentRevenue / (target.revenueTarget * (daysPassed / daysInMonth))) * 100
    : 0;
    
  const projectedPercentage = target.revenueTarget > 0
    ? (projectedRevenue / target.revenueTarget) * 100
    : 0;
  
  return {
    currentRevenue,
    targetRevenue: target.revenueTarget,
    daysPassed,
    daysInMonth,
    projectedRevenue,
    pacingPercentage,
    projectedPercentage,
    onTrack: projectedPercentage >= 95,
  };
}

/**
 * Calculate MER status with thresholds
 */
export function calculateMERStatus(metrics: DailyMetrics[]): MERStatus {
  const totalRevenue = metrics.reduce((sum, m) => sum + m.totalRevenue, 0);
  const totalSpend = metrics.reduce((sum, m) => sum + m.totalSpend, 0);
  
  const mer = totalRevenue > 0 ? totalSpend / totalRevenue : 0;
  
  let status: MERStatus['status'];
  let threshold: number;
  
  if (mer < 0.15) {
    status = 'excellent';
    threshold = 0.15;
  } else if (mer < 0.20) {
    status = 'good';
    threshold = 0.20;
  } else if (mer < 0.25) {
    status = 'warning';
    threshold = 0.25;
  } else {
    status = 'danger';
    threshold = 0.30;
  }
  
  return { value: mer, status, threshold };
}

/**
 * Calculate channel split (Web vs App)
 */
export function calculateChannelSplit(metrics: DailyMetrics[]): ChannelSplit {
  const web = metrics.reduce((sum, m) => sum + m.revenueWeb, 0);
  const app = metrics.reduce((sum, m) => sum + m.revenueApp, 0);
  const total = web + app;
  
  return {
    web,
    app,
    webPercentage: total > 0 ? (web / total) * 100 : 0,
    appPercentage: total > 0 ? (app / total) * 100 : 0,
  };
}

/**
 * Calculate platform comparison (FB vs Google)
 */
export function calculatePlatformComparison(metrics: DailyMetrics[]): PlatformComparison[] {
  const totals = metrics.reduce(
    (acc, m) => ({
      spendFB: acc.spendFB + m.spendFB,
      spendGoogle: acc.spendGoogle + m.spendGoogle,
      clicksFB: acc.clicksFB + m.clicksFB,
      clicksGoogle: acc.clicksGoogle + m.clicksGoogle,
      revenueWeb: acc.revenueWeb + m.revenueWeb,
      orders: acc.orders + m.orders,
    }),
    { spendFB: 0, spendGoogle: 0, clicksFB: 0, clicksGoogle: 0, revenueWeb: 0, orders: 0 }
  );
  
  // Estimated attribution: 60% FB, 40% Google for web revenue
  const fbRevenue = totals.revenueWeb * 0.6;
  const googleRevenue = totals.revenueWeb * 0.4;
  const fbOrders = Math.floor(totals.orders * 0.6);
  const googleOrders = Math.floor(totals.orders * 0.4);
  
  return [
    {
      platform: 'facebook',
      spend: totals.spendFB,
      revenue: fbRevenue,
      roas: totals.spendFB > 0 ? fbRevenue / totals.spendFB : 0,
      clicks: totals.clicksFB,
      cpc: totals.clicksFB > 0 ? totals.spendFB / totals.clicksFB : 0,
      cpa: fbOrders > 0 ? totals.spendFB / fbOrders : 0,
    },
    {
      platform: 'google',
      spend: totals.spendGoogle,
      revenue: googleRevenue,
      roas: totals.spendGoogle > 0 ? googleRevenue / totals.spendGoogle : 0,
      clicks: totals.clicksGoogle,
      cpc: totals.clicksGoogle > 0 ? totals.spendGoogle / totals.clicksGoogle : 0,
      cpa: googleOrders > 0 ? totals.spendGoogle / googleOrders : 0,
    },
  ];
}

/**
 * Calculate YoY comparison with smart date alignment
 */
export function calculateYoYComparison(
  currentMetrics: DailyMetrics[],
  historicalMetrics: DailyMetrics[],
  alignByDayOfWeek: boolean = true
): YoYComparison {
  const variance = currentMetrics.map((current) => {
    let previous: DailyMetrics | undefined;
    
    if (alignByDayOfWeek) {
      // Find matching day-of-week in previous year
      const alignedDate = alignDateByDayOfWeek(current.date);
      previous = historicalMetrics.find((h) => {
        const d = new Date(h.date);
        return (
          d.getFullYear() === alignedDate.getFullYear() &&
          d.getMonth() === alignedDate.getMonth() &&
          d.getDate() === alignedDate.getDate()
        );
      });
    } else {
      // Simple date matching
      const prevYear = current.date.getFullYear() - 1;
      previous = historicalMetrics.find((h) => {
        const d = new Date(h.date);
        return (
          d.getFullYear() === prevYear &&
          d.getMonth() === current.date.getMonth() &&
          d.getDate() === current.date.getDate()
        );
      });
    }
    
    const previousRevenue = previous?.totalRevenue || 0;
    const revenueVariance = current.totalRevenue - previousRevenue;
    
    return {
      date: current.date,
      revenueVariance,
      revenueVariancePercent: previousRevenue > 0 
        ? (revenueVariance / previousRevenue) * 100 
        : 0,
      ordersVariance: current.orders - (previous?.orders || 0),
      spendVariance: current.totalSpend - (previous?.totalSpend || 0),
      currentRevenue: current.totalRevenue,
      previousRevenue,
    };
  });
  
  return {
    currentPeriod: currentMetrics,
    previousPeriod: historicalMetrics,
    variance,
  };
}

// ============================================
// CHART DATA FORMATTING
// ============================================

/**
 * Format metrics for chart consumption
 */
export function formatChartData(
  metrics: DailyMetrics[],
  yoyComparison?: YoYComparison
): ChartDataPoint[] {
  return metrics.map((m, index) => {
    const yoy = yoyComparison?.variance[index];
    
    return {
      date: m.dateString,
      displayDate: formatDate(m.date, 'short'),
      revenue: m.totalRevenue,
      revenueYoY: yoyComparison?.previousPeriod[index]?.totalRevenue,
      spend: m.totalSpend,
      orders: m.orders,
      variance: yoy?.revenueVariance,
    };
  });
}

// ============================================
// FORMATTING UTILITIES
// ============================================

/**
 * Format currency
 */
export function formatCurrency(value: number, compact: boolean = false): string {
  if (compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

/**
 * Format number with K/M suffix
 */
export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}

/**
 * Format ROAS
 */
export function formatROAS(value: number): string {
  return `${value.toFixed(2)}x`;
}

// ============================================
// AGGREGATION UTILITIES  
// ============================================

/**
 * Aggregate metrics by date (combine all labels)
 */
export function aggregateByDate(metrics: DailyMetrics[]): DailyMetrics[] {
  const byDate = new Map<string, DailyMetrics>();
  
  for (const m of metrics) {
    const key = m.dateString;
    const existing = byDate.get(key);
    
    if (existing) {
      existing.revenueWeb += m.revenueWeb;
      existing.revenueApp += m.revenueApp;
      existing.totalRevenue += m.totalRevenue;
      existing.orders += m.orders;
      existing.spendFB += m.spendFB;
      existing.spendGoogle += m.spendGoogle;
      existing.totalSpend += m.totalSpend;
      existing.clicksFB += m.clicksFB;
      existing.clicksGoogle += m.clicksGoogle;
      existing.totalClicks += m.totalClicks;
      existing.contributionMargin += m.contributionMargin;
    } else {
      byDate.set(key, { ...m, label: 'All' });
    }
  }
  
  // Recalculate derived metrics
  return Array.from(byDate.values()).map((m) => ({
    ...m,
    aov: m.orders > 0 ? m.totalRevenue / m.orders : 0,
    mer: m.totalRevenue > 0 ? m.totalSpend / m.totalRevenue : 0,
    roasFB: m.spendFB > 0 ? (m.revenueWeb * 0.6) / m.spendFB : 0,
    roasGoogle: m.spendGoogle > 0 ? (m.revenueWeb * 0.4) / m.spendGoogle : 0,
  }));
}

/**
 * Filter metrics by date range
 */
export function filterByDateRange(
  metrics: DailyMetrics[],
  range: DateRange
): DailyMetrics[] {
  return metrics.filter((m) => {
    const date = new Date(m.date);
    return date >= range.start && date <= range.end;
  });
}

/**
 * Filter metrics by labels
 */
export function filterByLabels(
  metrics: DailyMetrics[],
  labels: string[]
): DailyMetrics[] {
  if (labels.length === 0) return metrics;
  return metrics.filter((m) => labels.includes(m.label));
}
