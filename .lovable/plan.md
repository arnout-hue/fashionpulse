

# Fix Tooltip Duplication and Add KPI Selector to "The Pulse" Chart

## Issues Identified

Based on the screenshot and code analysis:

### Problem 1: Duplicate Revenue Values in Tooltip
The tooltip shows:
- `revenue` (raw data value: 25,881.14)
- `Revenue` (formatted value: €25,881)
- `Revenue (YoY)` (comparison value: €25,771)

This happens because the chart has **both** an `Area` and a `Line` component using `dataKey="revenue"`. The Area doesn't have a name, so it shows the raw dataKey. The Line has `name={t.charts.revenue}` which shows the translated label.

### Problem 2: Static "YoY" Label
The tooltip and chart legend use static "Revenue (YoY)" text instead of showing the actual comparison year (e.g., "Revenue 2025").

### Problem 3: No KPI Selector
The chart currently only shows Revenue. User wants to switch between different metrics like AOV, Marketing Spend, ROAS.

---

## Solution Overview

1. **Fix duplicate tooltip** - Hide the Area component from tooltip (it's just decorative fill)
2. **Dynamic year labels** - Pass year information to the chart component and use it in line names
3. **Add KPI selector** - Add a toggle/selector above the chart to switch between metrics

---

## Technical Implementation

### File 1: `src/components/charts/SmartTrendChart.tsx`

**Changes:**

1. Update interface to accept dynamic labels and KPI selection:
```typescript
type ChartKPI = 'revenue' | 'aov' | 'spend' | 'roas';

interface SmartTrendChartProps {
  data: ChartDataPoint[];
  showYoY?: boolean;
  height?: number;
  className?: string;
  currentYear?: number;
  comparisonYear?: number;
  selectedKPI?: ChartKPI;
}
```

2. Hide Area from tooltip by setting `name=""` or adding `legendType="none"` with proper tooltip filtering

3. Update Line names to use dynamic years:
```typescript
// Instead of t.charts.revenueYoy
name={`${t.charts.revenue} ${comparisonYear}`}
```

4. Add KPI-aware data key selection that maps to the appropriate field based on selectedKPI

5. Update the SmartTooltip to filter out entries with empty names and format values based on the KPI type

### File 2: `src/components/pages/CommandCenter.tsx`

**Changes:**

1. Add state for selected KPI:
```typescript
const [selectedKPI, setSelectedKPI] = useState<ChartKPI>('revenue');
```

2. Add KPI selector buttons above the chart using tabs or button group

3. Pass `currentYear`, `comparisonYear`, and `selectedKPI` to SmartTrendChart

4. Extend `chartData` to include AOV, spend, and ROAS values for each data point

### File 3: `src/utils/analytics.ts`

**Changes:**

Update `formatChartData` function to include additional metrics:
```typescript
return {
  date: m.dateString,
  displayDate: formatDate(m.date, 'short'),
  revenue: m.totalRevenue,
  revenueYoY: yoyComparison?.previousPeriod[index]?.totalRevenue,
  spend: m.totalSpend,
  spendYoY: yoyComparison?.previousPeriod[index]?.totalSpend,
  orders: m.orders,
  aov: m.aov,
  aovYoY: yoyComparison?.previousPeriod[index]?.aov,
  roas: m.totalSpend > 0 ? m.totalRevenue / m.totalSpend : 0,
  roasYoY: /* calculate from previous period */,
  variance: yoy?.revenueVariance,
};
```

### File 4: `src/types/index.ts`

**Changes:**

Extend ChartDataPoint interface to include new fields:
```typescript
export interface ChartDataPoint {
  // existing fields...
  aov?: number;
  aovYoY?: number;
  spendYoY?: number;
  roas?: number;
  roasYoY?: number;
}
```

### File 5: `src/i18n/translations.ts`

**Changes:**

Add translation keys for KPI labels:
```typescript
charts: {
  // existing...
  aov: 'AOV',
  spend: 'Spend',
  roas: 'ROAS',
  selectKpi: 'Select Metric',
},
```

---

## Expected Result

### Fixed Tooltip:
```
Jan 20

Revenue 2026        €25,881
Revenue 2025        €25,771
─────────────────────────────
Variance            +€111
```

### KPI Selector:
Toggle buttons above the chart:
`[Revenue] [AOV] [Spend] [ROAS]`

When switching KPIs:
- Y-axis formatting updates (currency for Revenue/Spend/AOV, ratio for ROAS)
- Both current and comparison lines update to show the selected metric
- Tooltip shows appropriate values and labels

---

## Summary of Files to Modify

| File | Changes |
|------|---------|
| `src/components/charts/SmartTrendChart.tsx` | Fix duplicate tooltip, add dynamic years, support multiple KPIs |
| `src/components/pages/CommandCenter.tsx` | Add KPI selector state and UI, pass props to chart |
| `src/utils/analytics.ts` | Add AOV, spend, ROAS to chart data formatting |
| `src/types/index.ts` | Extend ChartDataPoint with new metric fields |
| `src/i18n/translations.ts` | Add translation keys for new KPI labels |

