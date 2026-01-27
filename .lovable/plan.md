

# Change Contribution Margin to Contribution Value (Percentage)

## Overview

Transform the 4th metric card from showing "Contribution Margin" (an absolute currency value) to "Contribution Value" - a percentage showing how much of the total revenue the selected label(s) represent compared to all labels within the same date range.

**Example behavior:**
- All labels selected (or no filter): Shows 100%
- Single brand selected that has 60% of total revenue: Shows 60%

---

## Technical Implementation

### File 1: `src/hooks/useFashionData.ts`

Add a new return value from `useFilteredData()` that provides the total revenue across ALL labels within the date range (not filtered by labels):

```typescript
// Add: Calculate total revenue for ALL labels within the date range
const totalRevenueAllLabels = useMemo(() => {
  if (!harmonizedData) return 0;
  
  // Filter by date range only (no label filter)
  const metricsInDateRange = harmonizedData.metrics.filter((m) => {
    const date = new Date(m.date);
    return date >= filters.dateRange.start && date <= filters.dateRange.end;
  });
  
  return metricsInDateRange.reduce((sum, m) => sum + m.totalRevenue, 0);
}, [harmonizedData, filters.dateRange]);

// Return it alongside existing values
return {
  metrics: filteredMetrics,
  target: currentTarget,
  allMetrics: harmonizedData?.metrics || [],
  allTargets: harmonizedData?.targets || [],
  availableLabels,
  totalRevenueAllLabels, // NEW
  ...queryState,
};
```

---

### File 2: `src/components/pages/CommandCenter.tsx`

**Changes:**

1. Extract `totalRevenueAllLabels` from the hook
2. Calculate contribution percentage
3. Update the 4th card to display percentage instead of currency

```typescript
// Extract from hook
const { metrics, target, allMetrics, totalRevenueAllLabels } = useFilteredData();

// Calculate contribution percentage
const contributionPercentage = useMemo(() => {
  if (totalRevenueAllLabels === 0) return 100;
  return (totals.revenue / totalRevenueAllLabels) * 100;
}, [totals.revenue, totalRevenueAllLabels]);

// Update the 4th card display
<div className="flex flex-col gap-1">
  <span className="metric-label">{t.commandCenter.contributionValue}</span>
  <span className="metric-value text-revenue">
    {contributionPercentage.toFixed(1)}%
  </span>
</div>
```

---

### File 3: `src/i18n/translations.ts`

Update translation keys:

**English:**
```typescript
commandCenter: {
  // Change from:
  contributionMargin: 'Contribution Margin',
  // To:
  contributionValue: 'Contribution',
}
```

**Dutch:**
```typescript
commandCenter: {
  // Change from:
  contributionMargin: 'Contributiemarge',
  // To:
  contributionValue: 'Bijdrage',
}
```

---

## Summary of Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useFashionData.ts` | Add `totalRevenueAllLabels` calculation and return value |
| `src/components/pages/CommandCenter.tsx` | Calculate and display contribution percentage |
| `src/i18n/translations.ts` | Update label from "Contribution Margin" to "Contribution" |

---

## Expected Result

**When all labels are selected:**
```
Contribution
100.0%
```

**When a single label is selected (representing 45% of total revenue):**
```
Contribution
45.0%
```

The color will always be the revenue color (violet) since it's a neutral informational metric rather than good/bad.

