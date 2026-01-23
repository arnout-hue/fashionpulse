import { parse, isValid } from 'date-fns';

// ============================================
// EUROPEAN FORMAT UTILITIES
// ============================================

/**
 * Parse European number format (comma as decimal separator)
 * Examples: "1633,5" -> 1633.5, "14,85" -> 14.85
 */
export function parseEuropeanNumber(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  
  if (typeof value === 'number') return value;
  
  // Replace comma with dot for decimal parsing
  const cleaned = String(value).trim().replace(',', '.');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse European date format (d-m-yyyy)
 * Examples: "1-1-2026" -> Date, "4-2-2026" -> Date
 */
export function parseEuropeanDate(value: string | undefined | null): Date | null {
  if (!value || typeof value !== 'string') return null;
  
  const trimmed = value.trim();
  
  // Try parsing with date-fns format 'd-M-yyyy'
  const parsed = parse(trimmed, 'd-M-yyyy', new Date());
  
  if (isValid(parsed)) {
    return parsed;
  }
  
  // Fallback: manual parsing for edge cases
  const parts = trimmed.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
    const year = parseInt(parts[2], 10);
    
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      const date = new Date(year, month, day);
      if (isValid(date)) {
        return date;
      }
    }
  }
  
  // Last resort: try ISO format
  const isoDate = new Date(trimmed);
  return isValid(isoDate) ? isoDate : null;
}

// ============================================
// COLUMN MAPPING
// ============================================

/**
 * Maps CSV headers to internal property names
 */
export const CSV_COLUMN_MAP = {
  'Date': 'date',
  'Label': 'brand',
  'Rev_Web': 'revenueWeb',
  'Rev_App': 'revenueApp',
  'Orders': 'ordersTotal',
  'Orders_App': 'ordersApp',
  'Conv_FB': 'conversionsFb',
  'Conv_Google': 'conversionsGoogle',
  'Spend_FB': 'spendFb',
  'Spend_Google': 'spendGoogle',
} as const;

// ============================================
// TRANSFORMED ROW TYPE
// ============================================

export interface TransformedSheetRow {
  date: Date;
  dateString: string;
  brand: string;
  
  // Revenue
  revenueWeb: number;
  revenueApp: number;
  totalRevenue: number;
  
  // Orders
  ordersTotal: number;
  ordersApp: number;
  ordersWeb: number; // Calculated: ordersTotal - ordersApp
  
  // Conversions
  conversionsFb: number;
  conversionsGoogle: number;
  totalConversions: number;
  
  // Spend
  spendFb: number;
  spendGoogle: number;
  totalSpend: number;
  
  // Calculated metrics
  aov: number;
  mer: number;
  contributionMargin: number;
  
  // Date metadata
  dayOfWeek: number;
  weekOfMonth: number;
  monthDay: number;
}

// ============================================
// TRANSFORMATION FUNCTION
// ============================================

/**
 * Transform a raw CSV row (with European formatting) into a clean typed object
 */
export function transformSheetRow(rawRow: Record<string, string>): TransformedSheetRow | null {
  // Parse date
  const parsedDate = parseEuropeanDate(rawRow['Date']);
  if (!parsedDate) {
    console.warn('Failed to parse date:', rawRow['Date']);
    return null;
  }
  
  // Parse numeric values with European format handling
  const revenueWeb = parseEuropeanNumber(rawRow['Rev_Web']);
  const revenueApp = parseEuropeanNumber(rawRow['Rev_App']);
  const ordersTotal = parseEuropeanNumber(rawRow['Orders']);
  const ordersApp = parseEuropeanNumber(rawRow['Orders_App']);
  const conversionsFb = parseEuropeanNumber(rawRow['Conv_FB']);
  const conversionsGoogle = parseEuropeanNumber(rawRow['Conv_Google']);
  const spendFb = parseEuropeanNumber(rawRow['Spend_FB']);
  const spendGoogle = parseEuropeanNumber(rawRow['Spend_Google']);
  
  // Calculated values
  const totalRevenue = revenueWeb + revenueApp;
  const ordersWeb = ordersTotal - ordersApp;
  const totalConversions = conversionsFb + conversionsGoogle;
  const totalSpend = spendFb + spendGoogle;
  const aov = ordersTotal > 0 ? totalRevenue / ordersTotal : 0;
  const mer = totalRevenue > 0 ? totalSpend / totalRevenue : 0;
  const contributionMargin = totalRevenue - totalSpend;
  
  // Date metadata
  const dayOfWeek = parsedDate.getDay();
  const firstDayOfMonth = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1);
  const weekOfMonth = Math.ceil((parsedDate.getDate() + firstDayOfMonth.getDay()) / 7);
  const monthDay = parsedDate.getDate();
  
  return {
    date: parsedDate,
    dateString: parsedDate.toISOString().split('T')[0],
    brand: rawRow['Label']?.trim() || 'Unknown',
    
    revenueWeb,
    revenueApp,
    totalRevenue,
    
    ordersTotal,
    ordersApp,
    ordersWeb,
    
    conversionsFb,
    conversionsGoogle,
    totalConversions,
    
    spendFb,
    spendGoogle,
    totalSpend,
    
    aov,
    mer,
    contributionMargin,
    
    dayOfWeek,
    weekOfMonth,
    monthDay,
  };
}

/**
 * Transform an array of raw CSV rows
 */
export function transformSheetData(rawRows: Record<string, string>[]): {
  data: TransformedSheetRow[];
  errors: number;
} {
  const data: TransformedSheetRow[] = [];
  let errors = 0;
  
  for (const row of rawRows) {
    const transformed = transformSheetRow(row);
    if (transformed) {
      data.push(transformed);
    } else {
      errors++;
    }
  }
  
  // Sort by date
  data.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  return { data, errors };
}

/**
 * Convert TransformedSheetRow to DailyMetrics format for compatibility
 */
export function toCompatibleMetrics(row: TransformedSheetRow): {
  date: Date;
  dateString: string;
  label: string;
  revenueWeb: number;
  revenueApp: number;
  totalRevenue: number;
  orders: number;
  aov: number;
  spendFB: number;
  spendGoogle: number;
  totalSpend: number;
  clicksFB: number;
  clicksGoogle: number;
  totalClicks: number;
  mer: number;
  contributionMargin: number;
  roasFB: number;
  roasGoogle: number;
  dayOfWeek: number;
  weekOfMonth: number;
  monthDay: number;
} {
  // Use conversions as a proxy for clicks (common in e-commerce)
  const clicksFB = row.conversionsFb;
  const clicksGoogle = row.conversionsGoogle;
  
  return {
    date: row.date,
    dateString: row.dateString,
    label: row.brand,
    revenueWeb: row.revenueWeb,
    revenueApp: row.revenueApp,
    totalRevenue: row.totalRevenue,
    orders: row.ordersTotal,
    aov: row.aov,
    spendFB: row.spendFb,
    spendGoogle: row.spendGoogle,
    totalSpend: row.totalSpend,
    clicksFB,
    clicksGoogle,
    totalClicks: clicksFB + clicksGoogle,
    mer: row.mer,
    contributionMargin: row.contributionMargin,
    roasFB: row.spendFb > 0 ? (row.revenueWeb * 0.6) / row.spendFb : 0,
    roasGoogle: row.spendGoogle > 0 ? (row.revenueWeb * 0.4) / row.spendGoogle : 0,
    dayOfWeek: row.dayOfWeek,
    weekOfMonth: row.weekOfMonth,
    monthDay: row.monthDay,
  };
}
