

# Make Dashboard Fully Dynamic with Comparison Date Picker

## Overview
This plan addresses three critical issues causing static/hardcoded values in your dashboard and adds a Google Analytics-style date picker with built-in comparison functionality.

---

## Issues Identified

| Issue | Location | Problem |
|-------|----------|---------|
| Target shows €100K | `useFashionData.ts:126-151` | Uses `new Date()` (today) instead of selected date range; fallback of €100K |
| 2025 Revenue not dynamic | `RevenueDeepDive.tsx:39` | Hardcoded `getFullYear() === 2025` |
| CommandCenter YoY static | `CommandCenter.tsx:60` | Same hardcoded year filter |
| Static year labels | `translations.ts:103-104` | Hardcoded "2026 Revenue" / "2025 Revenue" |

---

## Implementation Plan

### Step 1: Update Types for Comparison Mode
**File:** `src/types/index.ts`

Add new types for comparison functionality:
```typescript
export type ComparisonMode = 'previous_period' | 'previous_year' | 'custom';

export interface DashboardFilters {
  dateRange: DateRange;
  labels: Label[];
  channels: Channel[];
  platforms: Platform[];
  enableYoY: boolean;
  alignByDayOfWeek: boolean;
  // NEW
  comparisonEnabled: boolean;
  comparisonMode: ComparisonMode;
  comparisonRange: DateRange | null;
}
```

### Step 2: Update Dashboard Store
**File:** `src/store/dashboardStore.ts`

Add comparison state and actions:
- `setComparisonEnabled(enabled: boolean)`
- `setComparisonMode(mode: ComparisonMode)`
- `setComparisonRange(range: DateRange | null)`

Update `defaultFilters`:
```typescript
comparisonEnabled: false,
comparisonMode: 'previous_year',
comparisonRange: null,
```

### Step 3: Fix Target Calculation
**File:** `src/hooks/useFashionData.ts`

Change `currentTarget` to use the selected filter date instead of today:

```typescript
const currentTarget = useMemo(() => {
  if (!harmonizedData) return null;
  
  // Use filter end date instead of today
  const targetDate = filters.dateRange.end;
  const monthStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
  
  if (harmonizedData.targets.length > 0) {
    const relevantTargets = harmonizedData.targets.filter((t) => t.month === monthStr);
    if (relevantTargets.length > 0) {
      return {
        month: monthStr,
        label: 'Combined',
        revenueTarget: relevantTargets.reduce((sum, t) => sum + t.revenueTarget, 0),
        ordersTarget: relevantTargets.reduce((sum, t) => sum + t.ordersTarget, 0),
        merTarget: relevantTargets[0].merTarget,
      };
    }
  }
  
  // Return null instead of fake €100K fallback
  return null;
}, [harmonizedData, filters.dateRange]);
```

### Step 4: Make RevenueDeepDive Dynamic
**File:** `src/components/pages/RevenueDeepDive.tsx`

Replace hardcoded year filtering with dynamic comparison based on store:

```typescript
const previousYearMetrics = useMemo(() => {
  // Use comparison range from store if available
  if (filters.comparisonEnabled && filters.comparisonRange) {
    return aggregateByDate(
      allMetrics.filter((m) => {
        const d = new Date(m.date);
        return d >= filters.comparisonRange!.start && d <= filters.comparisonRange!.end;
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
```

Also update the year labels to be dynamic:
```typescript
const currentYear = filters.dateRange.start.getFullYear();
const comparisonYear = filters.comparisonRange 
  ? filters.comparisonRange.start.getFullYear()
  : currentYear - 1;
  
// Use: `${currentYear} Revenue` instead of t.revenueDeepDive.revenue2026
```

### Step 5: Make CommandCenter Dynamic
**File:** `src/components/pages/CommandCenter.tsx`

Same changes as RevenueDeepDive:
- Replace `getFullYear() === 2025` with dynamic year from comparison range
- Update chart legend to show actual years from data

### Step 6: Create Enhanced Date Range Picker
**File:** `src/components/dashboard/DateRangePicker.tsx`

Rewrite to include comparison functionality similar to Google Analytics:

**Features:**
- Presets sidebar (Today, Last 7 Days, This Month, etc.)
- Dual calendar for range selection
- "Compare" toggle checkbox
- Comparison mode selector:
  - Previous period (same number of days before primary range)
  - Same period last year
  - Custom range
- Apply / Cancel buttons
- Show calculated comparison dates

**UI Structure:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  ┌─────────────┐  ┌───────────────────────────────────────────────┐ │
│  │   Presets   │  │         Calendar (2 months)                   │ │
│  │  Today      │  │                                               │ │
│  │  Yesterday  │  │    Jan 1 - Jan 23, 2026                       │ │
│  │  Last 7...  │  │                                               │ │
│  │  ...        │  ├───────────────────────────────────────────────┤ │
│  └─────────────┘  │  ☑ Compare                                    │ │
│                   │  ◉ Previous period    ○ Same period last year │ │
│                   │  Comparison: Dec 9 - Dec 31, 2025             │ │
│                   └───────────────────────────────────────────────┘ │
│                              [Cancel]   [Apply]                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 7: Update Translations for Dynamic Labels
**File:** `src/i18n/translations.ts`

Change hardcoded year strings to use placeholders that get replaced at runtime:

```typescript
// English
revenueDeepDive: {
  currentRevenue: 'Current Period Revenue',   // Was: '2026 Revenue'
  comparisonRevenue: 'Comparison Period Revenue', // Was: '2025 Revenue'
  // ...
},

// Add comparison picker translations
comparison: {
  compare: 'Compare',
  previousPeriod: 'Previous period',
  samePeriodLastYear: 'Same period last year',
  custom: 'Custom',
  apply: 'Apply',
  cancel: 'Cancel',
},
```

### Step 8: Update Header Component
**File:** `src/components/dashboard/Header.tsx`

- Remove separate YoY toggle buttons (now inside date picker)
- Update the comparison context bar to show actual dates from store
- Display both primary and comparison ranges when comparison is enabled

---

## Technical Details

### Comparison Range Calculation
```typescript
function calculateComparisonRange(
  primary: DateRange,
  mode: ComparisonMode
): DateRange {
  const daysDiff = differenceInDays(primary.end, primary.start);
  
  switch (mode) {
    case 'previous_period':
      return {
        start: subDays(primary.start, daysDiff + 1),
        end: subDays(primary.start, 1),
      };
    case 'previous_year':
      return {
        start: subYears(primary.start, 1),
        end: subYears(primary.end, 1),
      };
    case 'custom':
      // Return existing custom range from store
      return existingRange;
  }
}
```

### Dynamic Year Display in Components
Instead of using translation keys like `t.revenueDeepDive.revenue2026`, compute the year dynamically:

```typescript
// In RevenueDeepDive
const currentYear = filters.dateRange.start.getFullYear();
const comparisonYear = comparisonRange?.start.getFullYear() ?? currentYear - 1;

// In MetricCard labels
<MetricCard
  label={`${currentYear} ${t.charts.revenue}`}  // "2026 Revenue"
  value={...}
/>
```

---

## Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `src/types/index.ts` | Modify | Add `ComparisonMode`, update `DashboardFilters` |
| `src/store/dashboardStore.ts` | Modify | Add comparison state and setters |
| `src/hooks/useFashionData.ts` | Modify | Fix target lookup, remove €100K fallback |
| `src/components/dashboard/DateRangePicker.tsx` | Rewrite | Add comparison UI |
| `src/components/pages/RevenueDeepDive.tsx` | Modify | Dynamic years, use comparison range |
| `src/components/pages/CommandCenter.tsx` | Modify | Dynamic years, use comparison range |
| `src/components/dashboard/Header.tsx` | Modify | Remove YoY buttons, update context bar |
| `src/i18n/translations.ts` | Modify | Add comparison translations, fix year labels |

---

## Expected Results

After implementation:
1. **Target block** will show actual targets from your sheet for the selected month (not €100K)
2. **Revenue cards** will show dynamic year labels based on your selected date range
3. **Comparison data** will be calculated dynamically from the comparison range
4. **Date picker** will match the Google Analytics style with built-in comparison toggle
5. **All charts and cards** will respond to date range and comparison selections

