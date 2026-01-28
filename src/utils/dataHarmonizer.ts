import type { 
  DailyMetrics, 
  MonthlyTarget, 
  DataRowRaw, 
  HarmonizedData,
  DataSource,
  EventAnnotation,
  EventType,
} from '@/types';
import { parseDataRow, safeParseRows } from '@/types';
import { transformToMetrics, getDaysInMonth } from './analytics';
import { transformSheetData, toCompatibleMetrics, parseEuropeanNumber, type TransformedSheetRow } from './sheetTransformer';
import { supabase } from '@/integrations/supabase/client';

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
  private events: EventAnnotation[] = [];
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
   * Normalize month from various formats to yyyy-MM
   * Handles: "1-2025", "01-2025", "1/2025", "01/2025" → "2025-01"
   */
  private normalizeMonth(monthStr: string): string {
    // Handle formats: "1-2025", "01-2025", "1/2025", "01/2025"
    const match = monthStr.match(/^(\d{1,2})[-\/](\d{4})$/);
    if (match) {
      const month = match[1].padStart(2, '0');
      const year = match[2];
      return `${year}-${month}`;
    }
    // Already in yyyy-MM format or other format
    return monthStr;
  }

  /**
   * Add monthly targets from Google Sheet with European format support
   */
  addTargets(rawData: unknown[]): { success: number; errors: number } {
    console.log('Parsing targets, raw data:', rawData);
    
    // Handle Google Sheet format with European numbers
    const targets: MonthlyTarget[] = [];
    let errors = 0;
    
    for (const row of rawData) {
      try {
        const r = row as Record<string, string>;
        
        // Get the month - support both "Month" and "month" headers
        const rawMonth = r['Month'] || r['month'] || '';
        const label = r['Label'] || r['label'] || 'All';
        
        // Normalize month to yyyy-MM format
        const month = this.normalizeMonth(rawMonth);
        
        // Parse European number format for targets - support multiple column name variations
        const revenueTarget = parseEuropeanNumber(
          r['Rev_target'] || r['Revenue_Target'] || r['revenue_target'] || r['RevenueTarget'] || '0'
        );
        const ordersTarget = parseEuropeanNumber(
          r['Orders_Target'] || r['orders_target'] || r['OrdersTarget'] || '0'
        );
        const merTargetRaw = parseEuropeanNumber(
          r['MER_Target'] || r['mer_target'] || r['MERTarget'] || '0.2'
        );
        
        // Also capture Ad_budget for potential future use
        const adBudget = parseEuropeanNumber(r['Ad_budget'] || r['ad_budget'] || '0');
        
        // MER target might be given as percentage (20) or decimal (0.20)
        const merTarget = merTargetRaw > 1 ? merTargetRaw / 100 : merTargetRaw;
        
        if (!rawMonth) {
          console.warn('Skipping target row without month:', r);
          errors++;
          continue;
        }
        
        console.log('Parsed target:', { rawMonth, month, label, revenueTarget, ordersTarget, merTarget, adBudget });
        
        targets.push({
          month,
          label,
          revenueTarget,
          ordersTarget,
          merTarget,
        });
      } catch (error) {
        console.warn('Failed to parse target row:', row, error);
        errors++;
      }
    }
    
    this.targets = targets;
    
    console.log('Final targets:', this.targets);
    
    if (errors > 0) {
      this.errors.push(`Targets: ${errors} rows failed validation`);
    }
    
    return { success: targets.length, errors };
  }

  /**
   * Add events from Google Sheet
   */
  addEvents(rawData: Record<string, string>[]): { success: number; errors: number } {
    const events: EventAnnotation[] = [];
    let errors = 0;

    for (const row of rawData) {
      try {
        const dateStr = row['Date'] || row['date'];
        if (!dateStr) continue;
        
        // Parse European date format (d-m-yyyy) or ISO format
        let date: Date;
        if (dateStr.includes('-') && dateStr.split('-')[0].length <= 2) {
          // European format: d-m-yyyy
          const [day, month, year] = dateStr.split('-').map(Number);
          date = new Date(year, month - 1, day);
        } else {
          date = new Date(dateStr);
        }
        
        if (isNaN(date.getTime())) {
          errors++;
          continue;
        }

        events.push({
          date,
          dateString: date.toISOString().split('T')[0],
          title: row['Title'] || row['title'] || 'Event',
          description: row['Description'] || row['description'],
          type: (row['Type'] || row['type'] || 'other').toLowerCase() as EventType,
          label: row['Label'] || row['label'],
        });
      } catch {
        errors++;
      }
    }

    this.events = events;
    
    if (errors > 0) {
      this.errors.push(`Events: ${errors} rows failed validation`);
    }
    
    return { success: events.length, errors };
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
      events: this.events,
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
    this.events = [];
    this.errors = [];
  }
}

// ============================================
// CSV PARSING UTILITY (European Format Support)
// ============================================

/**
 * Parse a CSV line handling quoted fields properly
 * Handles values like "14,85" where comma is inside quotes
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim().replace(/"/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  
  // Don't forget the last field
  result.push(current.trim().replace(/"/g, ''));
  
  return result;
}

/**
 * Parse CSV string to array of objects
 * Handles European format where values may contain commas as decimal separators
 * Properly handles quoted fields
 */
export function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  
  // Detect delimiter: if first line contains semicolons, use that; otherwise use comma
  const firstLine = lines[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';
  
  const headers = parseCSVLine(lines[0], delimiter);
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    const values = parseCSVLine(line, delimiter);
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
 * Primary: Uses Supabase Edge Function (bypasses CORS)
 * Fallback: Direct fetch (may fail due to CORS)
 */
export async function fetchGoogleSheetCSV(
  sheetId: string,  // Kept for fallback compatibility
  sheetName: string = 'Daily_Input'
): Promise<Record<string, string>[]> {
  
  // Try Edge Function first (bypasses CORS, uses server-side Sheet ID)
  if (supabase) {
    try {
      console.log(`Fetching via Edge Function: ${sheetName}`);
      
      const { data, error } = await supabase.functions.invoke('fetch-google-sheet', {
        body: { sheetName },
      });
      
      if (error) {
        console.warn('Edge Function error:', error);
        throw error;
      }
      
      // Edge function returns CSV text directly
      if (typeof data === 'string') {
        return parseCSV(data);
      }
      
      // If it returned an error object
      if (data?.error) {
        throw new Error(data.error);
      }
      
      throw new Error('Unexpected response format from Edge Function');
    } catch (e) {
      console.warn('Edge Function failed, trying direct fetch:', e);
    }
  }
  
  // Fallback to direct fetch (may fail due to CORS)
  console.log(`Fallback: Direct fetch for ${sheetName}`);
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 403 || response.status === 401) {
      throw new Error(`Access denied. Make sure the sheet is shared as "Anyone with the link can view".`);
    }
    throw new Error(`Failed to fetch sheet "${sheetName}": ${response.statusText}`);
  }
  
  const csv = await response.text();
  return parseCSV(csv);
}
