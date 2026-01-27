

# Change MER to ROAS and Enhance Dashboard

## Overview

This plan covers three main changes:
1. **Replace MER gauge with ROAS gauge** - with new thresholds (below 4 is red, 4-5 is yellow, 5+ is green)
2. **Color-code "The Pulse" chart** by KPI type - each metric gets its own color
3. **Show comparison numbers** in the metric cards (revenue, spend, orders) alongside the percentage change

---

## Changes Summary

### 1. Convert MER Gauge to ROAS Gauge

**Current MER Logic:**
- MER = Spend / Revenue (as a percentage, lower is better)
- Thresholds: <15% excellent, 15-20% good, 20-25% warning, >25% danger

**New ROAS Logic:**
- ROAS = Revenue / Spend (as a multiplier, higher is better)
- Thresholds: 5+ green (excellent), 4-5 yellow (warning), <4 red (danger)

**Files to modify:**

| File | Changes |
|------|---------|
| `src/components/dashboard/Gauges.tsx` | Rename MERGauge to ROASGauge, update display format from percentage to multiplier (e.g., "5.2x"), invert threshold logic, update gauge visualization |
| `src/utils/analytics.ts` | Create new `calculateROASStatus` function with inverted thresholds |
| `src/components/pages/CommandCenter.tsx` | Replace MER gauge usage with ROAS gauge |
| `src/i18n/translations.ts` | Update label from "MER vs target" to "ROAS vs target" |

**New ROAS Gauge visualization:**
- Scale: 0 to 8+ (instead of 0-40%)
- Color zones: 0-4 red, 4-5 yellow, 5-8+ green
- Display: "5.2x" format

---

### 2. Color-Code "The Pulse" Chart by KPI

**Current state:** All KPIs use the same violet (revenue) color

**New colors by KPI:**
- Revenue: Violet (`--revenue`)
- AOV: Violet (`--revenue`) - same as revenue, related metric
- Spend: Rose (`--spend`)
- ROAS: Green (`--profit`)

**Files to modify:**

| File | Changes |
|------|---------|
| `src/components/charts/SmartTrendChart.tsx` | Update `getKPIConfig` function to return different colors per KPI |

---

### 3. Show Comparison Numbers in Metric Cards

**Current state:** Cards show main value + percentage change (e.g., "+5.2% vs prev")

**New state:** Cards show:
- Main value
- Comparison value (in smaller text)
- Percentage change

Example:
```
Total Revenue
€125,000
€118,500 (+5.5%)
```

**Files to modify:**

| File | Changes |
|------|---------|
| `src/components/dashboard/MetricCard.tsx` | Add display of previous value alongside percentage, update layout to show both |
| `src/components/pages/CommandCenter.tsx` | Already passing `previousValue` prop - no changes needed |

---

## Technical Details

### ROAS Gauge Component Changes

```typescript
// New interface
interface ROASGaugeProps {
  value: number; // ROAS as multiplier (e.g., 5.2)
  status: 'excellent' | 'good' | 'warning' | 'danger';
  className?: string;
}

// New status calculation
function calculateROASStatus(metrics): ROASStatus {
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  
  if (roas >= 5) status = 'excellent';      // Green
  else if (roas >= 4) status = 'warning';   // Yellow  
  else status = 'danger';                    // Red
}
```

### Chart Color Configuration

```typescript
function getKPIConfig(kpi: ChartKPI): KPIConfig {
  switch (kpi) {
    case 'spend':
      return { color: 'hsl(var(--spend))', ... };
    case 'roas':
      return { color: 'hsl(var(--profit))', ... };
    default: // revenue, aov
      return { color: 'hsl(var(--revenue))', ... };
  }
}
```

### MetricCard Comparison Display

```typescript
// Show both comparison value and percentage
{previousValue !== undefined && (
  <div className="flex items-center gap-1 text-sm">
    <TrendIcon className="w-4 h-4" />
    <span className="text-muted-foreground">
      {formatCurrency(previousValue)} 
    </span>
    <span className={trendColor}>
      ({formatPercentage(change)})
    </span>
  </div>
)}
```

---

## Files to Modify

| File | Purpose |
|------|---------|
| `src/components/dashboard/Gauges.tsx` | Convert MER gauge to ROAS gauge with new thresholds and inverted logic |
| `src/utils/analytics.ts` | Add `calculateROASStatus` function |
| `src/components/pages/CommandCenter.tsx` | Use ROAS gauge instead of MER gauge |
| `src/components/charts/SmartTrendChart.tsx` | Update colors per KPI |
| `src/components/dashboard/MetricCard.tsx` | Show comparison value alongside percentage |
| `src/i18n/translations.ts` | Update translations for ROAS |

---

## Expected Results

### ROAS Gauge:
- Shows "5.2x" format instead of percentage
- Green/yellow/red zones based on 5/4 thresholds
- Label says "ROAS vs target of 5x"

### The Pulse Chart:
- Revenue/AOV: Violet line and gradient
- Spend: Rose line and gradient
- ROAS: Green line and gradient

### Metric Cards:
```
Total Revenue          Total Spend           Orders
€125,000              €24,500               3,959
€118,500 (+5.5%)      €23,100 (+6.1%)       3,750 (+5.6%)
```

