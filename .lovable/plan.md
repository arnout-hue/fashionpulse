
# Fix Target Data Not Updating from Google Sheet

## Problem Identified
After analyzing the code and your screenshot, I found **two issues** preventing targets from loading:

### Issue 1: Month Format Mismatch
- **Your sheet uses:** `1-2025` (month-year format)
- **Dashboard expects:** `2025-01` (year-month format with leading zero)

The code generates `monthStr = "2025-01"` and tries to match against your sheet's `"1-2025"`, which fails.

### Issue 2: Column Name Mismatch  
- **Your sheet has:** `Rev_target`, `Ad_budget`
- **Code looks for:** `Revenue_Target`, `RevenueTarget`, or `revenue_target`

Since `Rev_target` doesn't match any expected patterns, the revenue target defaults to 0.

---

## Solution

### File: `src/utils/dataHarmonizer.ts`

**Changes to `addTargets` method:**

1. **Normalize month format** - Convert various formats (`1-2025`, `01-2025`, `1/2025`) to the standard `yyyy-MM` format (e.g., `2025-01`)

2. **Support more column name variations:**
   - `Rev_target` → Add to lookup list
   - `Ad_budget` → Can be used for spend targets if needed

```typescript
// Normalize month from various formats to yyyy-MM
function normalizeMonth(monthStr: string): string {
  // Handle formats: "1-2025", "01-2025", "1/2025", "01/2025"
  const match = monthStr.match(/^(\d{1,2})[-\/](\d{4})$/);
  if (match) {
    const month = match[1].padStart(2, '0');
    const year = match[2];
    return `${year}-${month}`;
  }
  // Already in yyyy-MM format
  return monthStr;
}
```

3. **Update column lookups** to include `Rev_target`:
```typescript
const revenueTarget = parseEuropeanNumber(
  r['Rev_target'] || r['Revenue_Target'] || r['revenue_target'] || r['RevenueTarget'] || '0'
);
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/utils/dataHarmonizer.ts` | Add `normalizeMonth` helper, update column name lookups in `addTargets` |

---

## Technical Details

The `addTargets` method will be updated to:

1. Accept flexible month formats:
   - `1-2025` → `2025-01`
   - `01-2025` → `2025-01`  
   - `1/2025` → `2025-01`
   - `2025-01` → `2025-01` (unchanged)

2. Support these column names for revenue target:
   - `Rev_target` (your format)
   - `Revenue_Target`
   - `revenue_target`
   - `RevenueTarget`

3. Add logging to debug which values are being read

---

## Expected Result
After this fix, your "Month Pacing" block will show:
- **Target:** €567,891 × 4 labels = €2,271,564 (combined for January 2025)
- Proper pacing calculations against actual targets
