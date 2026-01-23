
# Fix Data Parsing for February 4th (and Similar Dates)

## Problem Summary
Data from date `4-2-2026` (February 4th) shows as `0` in the dashboard even though the Google Sheet contains:
```
4-2-2026 | FMH.DE | 3811,52 | 117,5 | 38,1 | 1521,17 | 533,49 | 525,79 | 5462 | 462
```

## Root Causes Identified

### 1. Timezone Shift Bug (Critical)
**Location:** `src/utils/sheetTransformer.ts` line 161

**Current code:**
```typescript
dateString: parsedDate.toISOString().split('T')[0]
```

**Problem:** `toISOString()` converts dates to UTC, which can shift dates backwards by a day depending on timezone. For example:
- Local: Feb 4, 2026 00:00:00 (CET/Netherlands)
- UTC: Feb 3, 2026 23:00:00
- Result: `dateString` becomes `2026-02-03` instead of `2026-02-04`

This causes Feb 4th data to be keyed as Feb 3rd, and when the dashboard looks for Feb 4th data, it finds nothing (0).

### 2. European Number Parsing (Potential)
**Location:** `src/utils/sheetTransformer.ts` line 11-21

**Current code:** Only replaces comma with dot for decimals

**Problem:** If your sheet uses dots as thousands separators (e.g., `1.200,50`), the current parser would incorrectly parse it as `1.2` instead of `1200.5`.

---

## Implementation Plan

### File: `src/utils/sheetTransformer.ts`

#### Change 1: Add `format` import from date-fns
```typescript
// Before
import { parse, isValid } from 'date-fns';

// After
import { parse, isValid, format } from 'date-fns';
```

#### Change 2: Fix European Number Parser
Update `parseEuropeanNumber()` to handle both thousands separators (dots) and decimal commas:

```typescript
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
```

**Examples:**
- `"3811,52"` → `3811.52` (works now and after)
- `"1.200,50"` → `1200.5` (currently broken, fixed after)
- `"14,85"` → `14.85` (works now and after)

#### Change 3: Fix European Date Parser
Add more flexible separator handling and fallback parsing:

```typescript
export function parseEuropeanDate(value: string | undefined | null): Date | null {
  if (!value || typeof value !== 'string') return null;
  
  const trimmed = value.trim();
  
  // Attempt 1: Parse strict European format (d-M-yyyy)
  let parsed = parse(trimmed, 'd-M-yyyy', new Date());
  
  // Attempt 2: If strict fails, try with flexible separators (d/M/yyyy or d.M.yyyy)
  if (!isValid(parsed)) {
    parsed = parse(trimmed.replace(/[./]/g, '-'), 'd-M-yyyy', new Date());
  }

  // Attempt 3: ISO Format fallback (yyyy-MM-dd)
  if (!isValid(parsed)) {
    parsed = parse(trimmed, 'yyyy-MM-dd', new Date());
  }

  return isValid(parsed) ? parsed : null;
}
```

#### Change 4: Fix Timezone Bug in transformSheetRow
Replace `toISOString()` with `format()` to keep local date:

```typescript
// Inside transformSheetRow function

// Before (line 161):
dateString: parsedDate.toISOString().split('T')[0]

// After:
const dateString = format(parsedDate, 'yyyy-MM-dd');
```

This uses date-fns `format()` which preserves the local timezone, so Feb 4th stays Feb 4th.

#### Change 5: Add column name backup for Google typos
Add a backup check for slightly different column names:

```typescript
const conversionsGoogle = parseEuropeanNumber(
  rawRow['Conv_Google'] || rawRow['Conversions_Google']
);
```

---

## Technical Summary

| Issue | Current Behavior | Fixed Behavior |
|-------|-----------------|----------------|
| `4-2-2026` date | Shifts to `2026-02-03` (UTC) | Stays `2026-02-04` (local) |
| `1.200,50` number | Parses as `1.2` | Parses as `1200.5` |
| `3811,52` number | Parses as `3811.52` | Unchanged |

---

## Files to Modify

1. **`src/utils/sheetTransformer.ts`**
   - Add `format` import
   - Update `parseEuropeanNumber()` - handle thousands separators
   - Update `parseEuropeanDate()` - add flexible separator support
   - Fix `transformSheetRow()` - use `format()` instead of `toISOString()`

## Verification
After the fix:
1. Feb 4th data should show correct revenue of ~3811.52 + 117.5 = ~3929
2. Console logs should show `dateString: "2026-02-04"` instead of `2026-02-03`
