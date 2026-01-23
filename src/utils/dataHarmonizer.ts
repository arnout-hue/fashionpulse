import type { 
  DailyMetrics, 
  MonthlyTarget, 
  DataRowRaw, 
  MonthlyTargetRaw,
  HarmonizedData,
  DataSource,
} from '@/types';
import { parseDataRow, parseMonthlyTarget, safeParseRows } from '@/types';
import { transformToMetrics, transformToTarget, getDaysInMonth } from './analytics';
import { transformSheetData, toCompatibleMetrics, type TransformedSheetRow } from './sheetTransformer';

// ============================================
// DATA HARMONIZER
// ============================================

/**
 * DataHarmonizer: Merges historical and live data sources
 * - Handles missing days by filling with zeros
 * - Sorts by date
 * - Validates and transforms data
 */
export class DataHarmonizer {
  private historicalData: DailyMetrics[] = [];
  private liveData: DailyMetrics[] = [];
  private targets: MonthlyTarget[] = [];
  private errors: string[] = [];

  /**
   * Add historical data (from JSON/CSV)
   */
  addHistoricalData(rawData: unknown[], year: number): { success: number; errors: number } {
    const { valid, errors } = safeParseRows(rawData, parseDataRow);
    
    const metrics = valid
      .filter((row: DataRowRaw) => new Date(row.Date).getFullYear() === year)
      .map(transformToMetrics);
    
    this.historicalData.push(...metrics);
    
    if (errors > 0) {
      this.errors.push(`Historical data (${year}): ${errors} rows failed validation`);
    }
    
    return { success: valid.length, errors };
  }

  /**
   * Add live data from Google Sheet with European format support
   */
  addLiveDataEuropean(rawData: Record<string, string>[]): { success: number; errors: number } {
    const { data, errors } = transformSheetData(rawData);
    
    // Convert to DailyMetrics format for compatibility
    const metrics = data.map(toCompatibleMetrics);
    this.liveData = metrics;
    
    if (errors > 0) {
      this.errors.push(`Live data: ${errors} rows failed validation`);
    }
    
    return { success: data.length, errors };
  }

  /**
   * Add live data (from Google Sheet) - legacy method
   */
  addLiveData(rawData: unknown[]): { success: number; errors: number } {
    const { valid, errors } = safeParseRows(rawData, parseDataRow);
    
    const metrics = valid.map(transformToMetrics);
    this.liveData = metrics;
    
    if (errors > 0) {
      this.errors.push(`Live data: ${errors} rows failed validation`);
    }
    
    return { success: valid.length, errors };
  }

  /**
   * Add monthly targets
   */
  addTargets(rawData: unknown[]): { success: number; errors: number } {
    const { valid, errors } = safeParseRows(rawData, parseMonthlyTarget);
    
    this.targets = valid.map(transformToTarget);
    
    if (errors > 0) {
      this.errors.push(`Targets: ${errors} rows failed validation`);
    }
    
    return { success: valid.length, errors };
  }

  /**
   * Fill missing days with zero values
   */
  private fillMissingDays(metrics: DailyMetrics[], labels: string[]): DailyMetrics[] {
    if (metrics.length === 0) return metrics;

    const dates = metrics.map((m) => new Date(m.date).getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    const existingKeys = new Set(metrics.map((m) => `${m.dateString}-${m.label}`));
    const filledMetrics: DailyMetrics[] = [...metrics];
    
    // Iterate through each day
    const current = new Date(minDate);
    while (current <= maxDate) {
      const dateString = current.toISOString().split('T')[0];
      
      for (const label of labels) {
        const key = `${dateString}-${label}`;
        
        if (!existingKeys.has(key)) {
          filledMetrics.push({
            date: new Date(current),
            dateString,
            label,
            revenueWeb: 0,
            revenueApp: 0,
            totalRevenue: 0,
            orders: 0,
            aov: 0,
            spendFB: 0,
            spendGoogle: 0,
            totalSpend: 0,
            clicksFB: 0,
            clicksGoogle: 0,
            totalClicks: 0,
            mer: 0,
            contributionMargin: 0,
            roasFB: 0,
            roasGoogle: 0,
            dayOfWeek: current.getDay(),
            weekOfMonth: Math.ceil((current.getDate() + new Date(current.getFullYear(), current.getMonth(), 1).getDay()) / 7),
            monthDay: current.getDate(),
          });
        }
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return filledMetrics;
  }

  /**
   * Get harmonized output
   */
  harmonize(fillMissing: boolean = true): HarmonizedData {
    // Combine all metrics
    let allMetrics = [...this.historicalData, ...this.liveData];
    
    // Get unique labels
    const labels = [...new Set(allMetrics.map((m) => m.label))];
    
    // Fill missing days if requested
    if (fillMissing && allMetrics.length > 0) {
      allMetrics = this.fillMissingDays(allMetrics, labels);
    }
    
    // Sort by date
    allMetrics.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Build sources metadata
    const sources: DataSource[] = [];
    
    const historicalYears = [...new Set(this.historicalData.map((m) => new Date(m.date).getFullYear()))];
    for (const year of historicalYears) {
      sources.push({
        type: 'historical',
        year,
        data: this.historicalData.filter((m) => new Date(m.date).getFullYear() === year),
      });
    }
    
    if (this.liveData.length > 0) {
      const liveYear = new Date(this.liveData[0].date).getFullYear();
      sources.push({
        type: 'live',
        year: liveYear,
        data: this.liveData,
      });
    }
    
    return {
      metrics: allMetrics,
      targets: this.targets,
      lastUpdated: new Date(),
      sources,
    };
  }

  /**
   * Get validation errors
   */
  getErrors(): string[] {
    return this.errors;
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.historicalData = [];
    this.liveData = [];
    this.targets = [];
    this.errors = [];
  }
}

// ============================================
// CSV PARSING UTILITY (European Format Support)
// ============================================

/**
 * Parse CSV string to array of objects
 * Handles European format where values may contain commas as decimal separators
 * Uses semicolon detection for European CSVs
 */
export function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  
  // Detect delimiter: if first line contains semicolons, use that; otherwise use comma
  const firstLine = lines[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';
  
  const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/"/g, ''));
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    const values = line.split(delimiter).map((v) => v.trim().replace(/"/g, ''));
    const row: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row);
  }
  
  return rows;
}

/**
 * Fetch and parse Google Sheet as CSV
 */
export async function fetchGoogleSheetCSV(
  sheetId: string,
  gid: string = '0'
): Promise<Record<string, string>[]> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet: ${response.statusText}`);
  }
  
  const csv = await response.text();
  return parseCSV(csv);
}
