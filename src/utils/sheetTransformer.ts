import { parse, isValid, format } from 'date-fns';

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
  
  let strVal = String(value).trim();
  
  // Step 1: Remove all dots (thousands separators in European format)
  const noDots = strVal.replace(/\./g, '');
  
  // Step 2: Replace comma with dot (decimal separator)
  const withDecimal = noDots.replace(',', '.');
  
  const parsed = parseFloat(withDecimal);
  
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse European date format (d-m-yyyy)
 * Examples: "1-1-2026" -> Date, "4-2-2026" -> Date
 */
export function parseEuropeanDate(value: string | undefined | null): Date | null {
  if (!value || typeof value !== 'string') return null;
  
  const trimmed = value.trim();
  
  // Attempt 1: Parse strict European format (d-M-yyyy)
  let parsed = parse(trimmed, 'd-M-yyyy', new Date());
  
  // Attempt 2: If strict fails, try flexible separators (d/M/yyyy or d.M.yyyy)
  if (!isValid(parsed)) {
    parsed = parse(trimmed.replace(/[./]/g, '-'), 'd-M-yyyy', new Date());
  }

  // Attempt 3: ISO Format fallback (yyyy-MM-dd)
  if (!isValid(parsed)) {
    parsed = parse(trimmed, 'yyyy-MM-dd', new Date());
  }

  return isValid(parsed) ? parsed : null;
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
 * Check if a row is completely empty (no meaningful data)
 */
function isEmptyRow(rawRow: Record<string, string>): boolean {
  const dateValue = rawRow['Date']?.trim();
  const labelValue = rawRow['Label']?.trim();
  
  // If both date and label are empty, consider the row empty
  return (!dateValue || dateValue === '') && (!labelValue || labelValue === '');
}

/**
 * Transform a raw CSV row (with European formatting) into a clean typed object
 * Returns null for empty rows (to be silently skipped) or invalid rows (to be counted as errors)
 */
export function transformSheetRow(rawRow: Record<string, string>): { row: TransformedSheetRow | null; isEmpty: boolean } {
  // Check if this is an empty row first
  if (isEmptyRow(rawRow)) {
    return { row: null, isEmpty: true };
  }
  
  // Parse date
  const parsedDate = parseEuropeanDate(rawRow['Date']);
  if (!parsedDate) {
    console.warn('Failed to parse date:', rawRow['Date']);
    return { row: null, isEmpty: false };
  }
  
  // Parse numeric values with European format handling
  const revenueWeb = parseEuropeanNumber(rawRow['Rev_Web']);
  const revenueApp = parseEuropeanNumber(rawRow['Rev_App']);
  const ordersTotal = parseEuropeanNumber(rawRow['Orders']);
  const ordersApp = parseEuropeanNumber(rawRow['Orders_App']);
  const conversionsFb = parseEuropeanNumber(rawRow['Conv_FB']);
  const conversionsGoogle = parseEuropeanNumber(rawRow['Conv_Google'] || rawRow['Conversions_Google']);
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
  
  // Use format() instead of toISOString() to preserve local timezone
  const dateString = format(parsedDate, 'yyyy-MM-dd');
  
  return {
    row: {
      date: parsedDate,
      dateString,
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
    },
    isEmpty: false,
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
  
  for (const rawRow of rawRows) {
    const result = transformSheetRow(rawRow);
    
    // Skip empty rows silently
    if (result.isEmpty) {
      continue;
    }
    
    // Count actual parsing failures
    if (result.row) {
      data.push(result.row);
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
