

# Enhanced Date Range Picker with Weeks, Quarters & Years

## Overview

Enhance the existing DateRangePicker with more comprehensive date selection options including:
- **Week Selection**: This Week, Last Week, click-to-select entire week via week numbers
- **Quarter Selection**: This Quarter, Last Quarter, Q1-Q4 for current/previous years
- **Year Selection**: This Year, Last Year, specific year presets (2024, 2025, 2026)
- **Week Number Display**: Show ISO week numbers in the calendar

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/DateRangePicker.tsx` | Add expanded presets, week number support, organized preset categories |
| `src/components/ui/calendar.tsx` | Enable week number display and click-to-select week functionality |
| `src/i18n/translations.ts` | Add new translation keys for week/quarter/year presets |

---

## Enhanced Presets Structure

The sidebar will be organized into categories for easy navigation:

```text
+------------------+
| QUICK SELECT     |
+------------------+
| Today            |
| Yesterday        |
+------------------+
| WEEKS            |
+------------------+
| This Week        |
| Last Week        |
| Last 2 Weeks     |
+------------------+
| MONTHS           |
+------------------+
| This Month       |
| Last Month       |
| Last 3 Months    |
+------------------+
| QUARTERS         |
+------------------+
| This Quarter     |
| Last Quarter     |
| Q1 2026          |
| Q4 2025          |
+------------------+
| YEARS            |
+------------------+
| This Year (YTD)  |
| Last Year        |
| 2025             |
| 2024             |
+------------------+
```

---

## Implementation Details

### 1. Calendar Enhancement (`src/components/ui/calendar.tsx`)

Add props to enable week number display:
- Pass `showWeekNumber={true}` to DayPicker
- Add styling for week number column
- Support `onWeekNumberClick` callback for week selection

```typescript
// Add week number column styling
week_number: "text-muted-foreground text-[0.65rem] w-8 text-center cursor-pointer hover:bg-accent rounded"
```

### 2. Expanded Presets (`src/components/dashboard/DateRangePicker.tsx`)

Add categorized preset groups:

```typescript
const presetCategories = [
  {
    label: t.datePicker.quickSelect,
    presets: [
      { label: t.datePicker.today, getValue: () => ({ from: new Date(), to: new Date() }) },
      { label: t.datePicker.yesterday, getValue: () => ({ from: subDays(new Date(), 1), to: subDays(new Date(), 1) }) },
    ]
  },
  {
    label: t.datePicker.weeks,
    presets: [
      { label: t.datePicker.thisWeek, getValue: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
      { label: t.datePicker.lastWeek, getValue: () => { const lw = subWeeks(new Date(), 1); return { from: startOfWeek(lw, { weekStartsOn: 1 }), to: endOfWeek(lw, { weekStartsOn: 1 }) }; } },
    ]
  },
  {
    label: t.datePicker.quarters,
    presets: [
      { label: t.datePicker.thisQuarter, getValue: () => ({ from: startOfQuarter(new Date()), to: endOfQuarter(new Date()) }) },
      { label: t.datePicker.lastQuarter, getValue: () => { const lq = subQuarters(new Date(), 1); return { from: startOfQuarter(lq), to: endOfQuarter(lq) }; } },
    ]
  },
  {
    label: t.datePicker.years,
    presets: [
      { label: t.datePicker.thisYear, getValue: () => ({ from: startOfYear(new Date()), to: new Date() }) },
      { label: t.datePicker.lastYear, getValue: () => { const ly = subYears(new Date(), 1); return { from: startOfYear(ly), to: endOfYear(ly) }; } },
    ]
  },
];
```

### 3. Week Number Click Handler

When user clicks on a week number in the calendar:
```typescript
const handleWeekNumberClick = (weekNumber: number, dates: Date[]) => {
  if (dates.length > 0) {
    const weekStart = startOfWeek(dates[0], { weekStartsOn: 1 });
    const weekEnd = endOfWeek(dates[0], { weekStartsOn: 1 });
    setPendingDate({ from: weekStart, to: weekEnd });
  }
};
```

### 4. Visual Design

```text
+------------------------------------------------------------------+
|  Jan 1, 2026 - Jan 31, 2026                              [v]    |
+------------------------------------------------------------------+
                                |
                                v
+---------------------+----------------------------------------+
| Kies een datum      |      January 2026      February 2026  |
+---------------------+  Wk | Mo Tu We Th Fr Sa Su | Mo Tu ...  |
| Vandaag             |  01 |        1  2  3  4  5 |  ...       |
| Gisteren            |  02 |  6  7  8  9 10 11 12 |  ...       |
+---------------------+  03 | 13 14 15 16 17 18 19 |  ...       |
| WEKEN               |  04 | 20 21 22 [23 24 25 26] ← selected |
| Deze week           |  05 | 27 28 29 30 31       |  ...       |
| Vorige week         +----------------------------------------+
+---------------------+                                         |
| KWARTALEN           |  [x] Vergelijken                        |
| Dit kwartaal        |  ( ) Vorige periode                     |
| Vorig kwartaal      |  ( ) Zelfde periode vorig jaar          |
| Q1 2026             |                                         |
+---------------------+  Comparison: Jan 1, 2025 - Jan 31, 2025 |
| JAREN               |                                         |
| Dit jaar            +--------------------+--------------------+
| Vorig jaar          |     [Annuleren]    |    [Toepassen]     |
| 2025                +--------------------+--------------------+
+---------------------+
```

---

## New Translation Keys

### English (`en`)
```typescript
datePicker: {
  // existing keys...
  quickSelect: 'Quick Select',
  weeks: 'Weeks',
  thisWeek: 'This Week',
  lastWeek: 'Last Week',
  last2Weeks: 'Last 2 Weeks',
  months: 'Months',
  last3Months: 'Last 3 Months',
  quarters: 'Quarters',
  lastQuarter: 'Last Quarter',
  years: 'Years',
  lastYear: 'Last Year',
}
```

### Dutch (`nl`)
```typescript
datePicker: {
  // existing keys...
  quickSelect: 'Snel Selecteren',
  weeks: 'Weken',
  thisWeek: 'Deze week',
  lastWeek: 'Vorige week',
  last2Weeks: 'Laatste 2 weken',
  months: 'Maanden',
  last3Months: 'Laatste 3 maanden',
  quarters: 'Kwartalen',
  lastQuarter: 'Vorig kwartaal',
  years: 'Jaren',
  lastYear: 'Vorig jaar',
}
```

---

## New date-fns Imports

Add these imports to DateRangePicker:
```typescript
import { 
  startOfWeek, 
  endOfWeek, 
  startOfQuarter, 
  endOfQuarter, 
  endOfYear,
  subWeeks,
  subQuarters,
  getQuarter,
  getISOWeek 
} from "date-fns"
```

---

## Technical Notes

- Uses `weekStartsOn: 1` (Monday) for ISO week standard (common in EU/Netherlands)
- Quarter calculations use `date-fns` which follows calendar quarters (Q1=Jan-Mar, etc.)
- Week numbers displayed using `showWeekNumber` prop from react-day-picker
- Clicking week number selects entire week (Mon-Sun)
- All existing functionality preserved (comparison mode, day-of-week alignment, Apply/Cancel)

---

## Implementation Steps

1. **Add translations** - Add new translation keys for weeks/quarters/years
2. **Update Calendar component** - Enable week number display with styling
3. **Refactor DateRangePicker** - Organize presets into categories with separators, add week click handler
4. **Test** - Verify week/quarter/year selections work correctly with comparison mode

