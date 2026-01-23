

# Add Weekday Alignment Toggle & Fix 2025 Revenue Display

## Issues Identified

### 1. Missing Weekday Alignment Toggle
The `alignByDayOfWeek` setting exists in the store and is used by `calculateYoYComparison`, but the new DateRangePicker UI has no toggle for it. This was removed when redesigning the picker.

### 2. 2025 Revenue Not Showing in Revenue Analysis
When comparing Jan 1-7, 2026 to Jan 1-7, 2025, the comparison metrics show €0. The issue is in how dates are filtered in `RevenueDeepDive.tsx`:

```typescript
// Current code (line 40-46)
allMetrics.filter((m) => {
  const d = new Date(m.date);
  return d >= filters.comparisonRange!.start && d <= filters.comparisonRange!.end;
})
```

The problem: Date comparison using `>=` and `<=` includes time components. If `comparisonRange.start` is `2025-01-01T00:00:00` but the data has dates like `2025-01-01T12:00:00` (or any other time), the comparison might fail or be inconsistent.

---

## Solution

### Step 1: Add Weekday Alignment Toggle to DateRangePicker
**File:** `src/components/dashboard/DateRangePicker.tsx`

Add a checkbox for "Match day of week" that appears when comparison is enabled:

```typescript
// Add local pending state
const [pendingAlignByDayOfWeek, setPendingAlignByDayOfWeek] = useState(filters.alignByDayOfWeek)

// In the comparison section, add:
<div className="flex items-center space-x-2">
  <Checkbox 
    id="weekday-align" 
    checked={pendingAlignByDayOfWeek}
    onCheckedChange={(checked) => setPendingAlignByDayOfWeek(checked === true)}
  />
  <Label htmlFor="weekday-align" className="text-sm cursor-pointer">
    {t.datePicker.matchDayOfWeek}
  </Label>
</div>
```

Update the Apply handler to also call `toggleDayOfWeekAlign` when needed.

### Step 2: Add Translation Keys for Weekday Alignment
**File:** `src/i18n/translations.ts`

Add to datePicker section:
- English: `matchDayOfWeek: 'Match day of week'`
- Dutch: `matchDayOfWeek: 'Weekdag uitlijning'`

### Step 3: Fix Date Filtering in RevenueDeepDive
**File:** `src/components/pages/RevenueDeepDive.tsx`

Normalize dates to compare only the date part (strip time):

```typescript
const previousYearMetrics = useMemo(() => {
  if (filters.comparisonEnabled && filters.comparisonRange) {
    // Normalize comparison range to start/end of day
    const rangeStart = new Date(filters.comparisonRange.start);
    rangeStart.setHours(0, 0, 0, 0);
    
    const rangeEnd = new Date(filters.comparisonRange.end);
    rangeEnd.setHours(23, 59, 59, 999);
    
    return aggregateByDate(
      allMetrics.filter((m) => {
        const d = new Date(m.date);
        d.setHours(12, 0, 0, 0); // Normalize to midday
        return d >= rangeStart && d <= rangeEnd;
      })
    );
  }
  
  // Fallback...
}, [allMetrics, filters.dateRange, filters.comparisonEnabled, filters.comparisonRange]);
```

### Step 4: Apply Same Fix to CommandCenter
**File:** `src/components/pages/CommandCenter.tsx`

Apply the same date normalization fix for consistency.

### Step 5: Update Dashboard Store (Optional Enhancement)
**File:** `src/store/dashboardStore.ts`

Add a setter for `alignByDayOfWeek` that can be called from the DateRangePicker:

```typescript
setAlignByDayOfWeek: (align: boolean) =>
  set((state) => ({
    filters: { ...state.filters, alignByDayOfWeek: align },
  })),
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/dashboard/DateRangePicker.tsx` | Add weekday alignment toggle checkbox |
| `src/i18n/translations.ts` | Add `matchDayOfWeek` translation |
| `src/components/pages/RevenueDeepDive.tsx` | Fix date filtering with time normalization |
| `src/components/pages/CommandCenter.tsx` | Same date filtering fix |
| `src/store/dashboardStore.ts` | Add `setAlignByDayOfWeek` setter |

---

## Technical Details

### Why Date Comparison Fails

JavaScript Date comparison includes milliseconds:
```javascript
new Date('2025-01-01') >= new Date('2025-01-01T00:00:00.000Z') // true
new Date('2025-01-01T06:00:00') >= new Date('2025-01-01T12:00:00') // false!
```

When the `comparisonRange` is calculated from `subYears()`, it preserves the original time. If your data has dates with different time components (or from parsing), the comparison can exclude valid records.

### Solution: Normalize to Day Boundaries

```typescript
// Set range start to beginning of day
rangeStart.setHours(0, 0, 0, 0);  // 00:00:00.000

// Set range end to end of day  
rangeEnd.setHours(23, 59, 59, 999);  // 23:59:59.999

// Normalize data dates to midday (avoids edge cases)
dataDate.setHours(12, 0, 0, 0);
```

This ensures any date that falls on Jan 1, 2025 will match, regardless of its time component.

---

## Expected Results

After implementation:
1. **Weekday alignment toggle** will appear in the date picker when comparison is enabled
2. **2025 Revenue** will correctly show when comparing Jan 1-7, 2026 to Jan 1-7, 2025
3. **All date ranges** will filter correctly regardless of time components in the data

