import { z } from 'zod';

// ============================================
// ENUMS & CONSTANTS
// ============================================

// Labels are now dynamic from the sheet - this is just a fallback list
export const DEFAULT_LABELS = [
  'FMH.NL',
  'FMH.BE',
] as const;

// Label type is now a string to support any label from the sheet
export type Label = string;

export const CHANNELS = ['web', 'app'] as const;
export type Channel = typeof CHANNELS[number];

export const PLATFORMS = ['facebook', 'google'] as const;
export type Platform = typeof PLATFORMS[number];

// Event types for color coding
export const EVENT_TYPES = ['marketing', 'technical', 'holiday', 'other'] as const;
export type EventType = typeof EVENT_TYPES[number];

// ============================================
// ZOD SCHEMAS - Robust data validation
// ============================================

// Schema for raw data row (from Google Sheet or CSV)
export const DataRowSchema = z.object({
  Date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  Label: z.string(),
  Rev_Web: z.preprocess((val) => Number(val) || 0, z.number().min(0)),
  Rev_App: z.preprocess((val) => Number(val) || 0, z.number().min(0)),
  Orders: z.preprocess((val) => Number(val) || 0, z.number().int().min(0)),
  Spend_FB: z.preprocess((val) => Number(val) || 0, z.number().min(0)),
  Spend_Google: z.preprocess((val) => Number(val) || 0, z.number().min(0)),
  Clicks_FB: z.preprocess((val) => Number(val) || 0, z.number().int().min(0)),
  Clicks_Google: z.preprocess((val) => Number(val) || 0, z.number().int().min(0)),
});

export type DataRowRaw = z.infer<typeof DataRowSchema>;

// Schema for monthly targets
export const MonthlyTargetSchema = z.object({
  Month: z.string(), // Format: "2026-01"
  Label: z.string(),
  Revenue_Target: z.preprocess((val) => Number(val) || 0, z.number().min(0)),
  Orders_Target: z.preprocess((val) => Number(val) || 0, z.number().int().min(0)),
  MER_Target: z.preprocess((val) => Number(val) || 0.2, z.number().min(0).max(1)),
});

export type MonthlyTargetRaw = z.infer<typeof MonthlyTargetSchema>;

// Schema for Events
export const EventSchema = z.object({
  Date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  Title: z.string(),
  Description: z.string().optional(),
  Type: z.enum(['marketing', 'technical', 'holiday', 'other']).default('other'),
  Label: z.string().optional(), // Link event to specific brand
});

export type EventRaw = z.infer<typeof EventSchema>;

// Processed event annotation
export interface EventAnnotation {
  date: Date;
  dateString: string;
  title: string;
  description?: string;
  type: EventType;
  label?: string; // Optional brand filter
}

// ============================================
// PROCESSED DATA TYPES
// ============================================

export interface DailyMetrics {
  date: Date;
  dateString: string; // ISO format
  label: Label | string;
  
  // Revenue
  revenueWeb: number;
  revenueApp: number;
  totalRevenue: number;
  
  // Orders
  orders: number;
  aov: number; // Average Order Value
  
  // Spend
  spendFB: number;
  spendGoogle: number;
  totalSpend: number;
  
  // Clicks
  clicksFB: number;
  clicksGoogle: number;
  totalClicks: number;
  
  // Calculated Metrics
  mer: number; // Marketing Efficiency Ratio
  contributionMargin: number; // Revenue - Spend
  roasFB: number;
  roasGoogle: number;
  
  // Day-of-week for smart alignment
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  weekOfMonth: number; // 1-5
  monthDay: number; // 1-31
}

export interface MonthlyTarget {
  month: string;
  label: Label | string;
  revenueTarget: number;
  ordersTarget: number;
  merTarget: number;
}

export interface PacingData {
  currentRevenue: number;
  targetRevenue: number;
  daysPassed: number;
  daysInMonth: number;
  projectedRevenue: number;
  pacingPercentage: number; // Current vs Target
  projectedPercentage: number; // Projected vs Target
  onTrack: boolean;
}

export interface MERStatus {
  value: number;
  status: 'excellent' | 'good' | 'warning' | 'danger';
  threshold: number;
}

export interface ChannelSplit {
  web: number;
  app: number;
  webPercentage: number;
  appPercentage: number;
}

export interface PlatformComparison {
  platform: Platform;
  spend: number;
  revenue: number; // Attributed
  roas: number;
  clicks: number;
  cpc: number;
  cpa: number; // Cost per acquisition (estimated)
}

export interface YoYComparison {
  currentPeriod: DailyMetrics[];
  previousPeriod: DailyMetrics[];
  variance: {
    date: Date;
    revenueVariance: number;
    revenueVariancePercent: number;
    ordersVariance: number;
    spendVariance: number;
    currentRevenue: number;
    previousRevenue: number;
  }[];
}

// ============================================
// UI STATE TYPES
// ============================================

export type ComparisonMode = 'previous_period' | 'previous_year' | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface DashboardFilters {
  dateRange: DateRange;
  labels: Label[];
  channels: Channel[];
  platforms: Platform[];
  enableYoY: boolean;
  alignByDayOfWeek: boolean;
  // Comparison functionality
  comparisonEnabled: boolean;
  comparisonMode: ComparisonMode;
  comparisonRange: DateRange | null;
}

export interface TooltipData {
  date: Date;
  metrics: DailyMetrics;
  yoyMetrics?: DailyMetrics;
  variance?: number;
  weather?: string; // Mocked
}

// ============================================
// API/FETCH TYPES
// ============================================

export interface GoogleSheetConfig {
  sheetId: string;
  dataRange: string;
  targetsRange: string;
}

export interface DataSource {
  type: 'historical' | 'live';
  year: number;
  data: DailyMetrics[];
}

export interface HarmonizedData {
  metrics: DailyMetrics[];
  targets: MonthlyTarget[];
  events: EventAnnotation[];
  lastUpdated: Date;
  sources: DataSource[];
}

// ============================================
// CHART TYPES
// ============================================

export type ChartKPI = 'revenue' | 'aov' | 'spend' | 'roas';

// Brand Benchmarking
export interface BrandBenchmarkPoint {
  label: string;
  revenue: number;
  spend: number;
  roas: number;
  orders: number;
  aov: number;
  growthPercentage: number;
  growthValue: number;
}

export interface ChartDataPoint {
  date: string;
  displayDate: string;
  revenue: number;
  revenueYoY?: number;
  spend: number;
  spendYoY?: number;
  orders: number;
  aov?: number;
  aovYoY?: number;
  roas?: number;
  roasYoY?: number;
  variance?: number;
  [key: string]: string | number | undefined;
}

export interface BentoCardProps {
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

// ============================================
// VALIDATION HELPERS
// ============================================

export function parseDataRow(row: unknown): DataRowRaw | null {
  try {
    return DataRowSchema.parse(row);
  } catch (error) {
    console.warn('Failed to parse data row:', error);
    return null;
  }
}

export function parseMonthlyTarget(row: unknown): MonthlyTargetRaw | null {
  try {
    return MonthlyTargetSchema.parse(row);
  } catch (error) {
    console.warn('Failed to parse target row:', error);
    return null;
  }
}

export function safeParseRows<T>(
  rows: unknown[],
  parser: (row: unknown) => T | null
): { valid: T[]; errors: number } {
  const valid: T[] = [];
  let errors = 0;
  
  for (const row of rows) {
    const parsed = parser(row);
    if (parsed) {
      valid.push(parsed);
    } else {
      errors++;
    }
  }
  
  return { valid, errors };
}
