
# Fix Label Filtering in YoY Comparison Data

## Problem Identified

The Year-over-Year (YoY) comparison is returning incorrect values because the comparison data is not filtered by the selected labels.

**What's happening:**
- When you select January 20, 2026 and compare to 2025
- The 2026 data shows the correct value (filtered by selected labels)
- The 2025 comparison data shows 35,221 which is the **total across all labels**
- You expected 25,770 which is only for `fashionmusthaves.nl`

**Root cause:**
The comparison data uses `allMetrics` (unfiltered) instead of respecting the label filter applied to the primary data.

---

## Technical Details

### Affected Files

1. `src/components/pages/RevenueDeepDive.tsx` (lines 37-64)
2. `src/components/pages/CommandCenter.tsx` (lines 62-96)

### Current Code Issue

```text
Current period:  metrics (filtered by labels) -> aggregateByDate
Comparison:      allMetrics (NOT filtered) -> aggregateByDate
```

### The Fix

Apply the same label filter to `allMetrics` before filtering by comparison date range:

```typescript
const previousYearMetrics = useMemo(() => {
  // First, apply label filter to allMetrics (same as primary data)
  let filteredAllMetrics = allMetrics;
  if (filters.labels.length > 0) {
    filteredAllMetrics = allMetrics.filter((m) => 
      filters.labels.includes(m.label)
    );
  }
  
  // Then filter by comparison date range
  if (filters.comparisonEnabled && filters.comparisonRange) {
    const rangeStart = new Date(filters.comparisonRange.start);
    rangeStart.setHours(0, 0, 0, 0);
    
    const rangeEnd = new Date(filters.comparisonRange.end);
    rangeEnd.setHours(23, 59, 59, 999);
    
    return aggregateByDate(
      filteredAllMetrics.filter((m) => {
        const d = new Date(m.date);
        d.setHours(12, 0, 0, 0);
        return d >= rangeStart && d <= rangeEnd;
      })
    );
  }
  
  // Fallback: previous year
  const previousYear = currentYear - 1;
  return aggregateByDate(
    filteredAllMetrics.filter((m) => 
      new Date(m.date).getFullYear() === previousYear
    )
  );
}, [allMetrics, filters.dateRange, filters.comparisonEnabled, 
    filters.comparisonRange, filters.labels, currentYear]);
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/pages/RevenueDeepDive.tsx` | Apply label filter before date filtering on comparison data |
| `src/components/pages/CommandCenter.tsx` | Same fix for consistency |

---

## Expected Result After Fix

When you select January 20, 2026 with label filter on `fashionmusthaves.nl`:
- 2026 value: 25,881 (fashionmusthaves.nl only)
- 2025 comparison: 25,770 (fashionmusthaves.nl only) - instead of 35,221

When no label filter is selected:
- 2026 value: 39,333 (all labels combined)
- 2025 comparison: 35,221 (all labels combined)
