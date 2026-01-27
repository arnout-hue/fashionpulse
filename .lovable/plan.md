

# Fix Edge Function & Gauge Ref Warning

## Overview

Two issues need to be addressed:
1. **Edge Function**: Add HTML detection to catch when Google returns a login page instead of CSV (happens when the sheet is private)
2. **Gauge Components**: Wrap `PacingGauge` and `MERGauge` with `forwardRef` to fix the React warning

---

## Issue 1: Edge Function HTML Detection

### Problem
When the Google Sheet is private (not shared as "Anyone with the link can view"), Google returns a login page (HTML) instead of CSV data. The Edge Function currently doesn't detect this and returns the HTML as if it were valid CSV.

### Solution
Add a check after fetching the response to detect if it contains HTML (indicating a login redirect).

### File Changes

**File:** `supabase/functions/fetch-google-sheet/index.ts`

Add HTML detection after fetching CSV:

```typescript
const csv = await response.text()

// Check if we got HTML (Login page) instead of CSV
if (csv.includes('<!DOCTYPE html>') || csv.includes('<html')) {
  console.error('Google Sheet is private - received login page HTML')
  return new Response(
    JSON.stringify({ 
      error: 'Google Sheet is private. Please set sharing to "Anyone with the link can view".' 
    }), 
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
```

Also add `Access-Control-Allow-Methods` to CORS headers for completeness.

---

## Issue 2: Gauge Components Ref Warning

### Problem
The console shows:
```
Warning: Function components cannot be given refs.
```

This happens because `BentoCard` uses Framer Motion's `motion.div`, which can attempt to pass refs to children for animation measurements. `PacingGauge` and `MERGauge` are regular function components that can't receive refs.

### Solution
Wrap both `PacingGauge` and `MERGauge` with `React.forwardRef()` and add `displayName` for debugging.

### File Changes

**File:** `src/components/dashboard/Gauges.tsx`

```typescript
import React, { forwardRef } from 'react';

// PacingGauge - wrap with forwardRef
export const PacingGauge = forwardRef<HTMLDivElement, PacingGaugeProps>(
  ({ pacing, className }, ref) => {
    // ... existing implementation
    return (
      <div ref={ref} className={cn('space-y-6', className)}>
        {/* ... rest of component */}
      </div>
    );
  }
);

PacingGauge.displayName = 'PacingGauge';

// MERGauge - wrap with forwardRef
export const MERGauge = forwardRef<HTMLDivElement, MERGaugeProps>(
  ({ value, status, className }, ref) => {
    // ... existing implementation
    return (
      <div ref={ref} className={cn('space-y-4', className)}>
        {/* ... rest of component */}
      </div>
    );
  }
);

MERGauge.displayName = 'MERGauge';
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `supabase/functions/fetch-google-sheet/index.ts` | Add HTML detection for private sheet error |
| `src/components/dashboard/Gauges.tsx` | Wrap `PacingGauge` and `MERGauge` with `forwardRef` |

---

## Prerequisite Check

**Google Sheet sharing**: Ensure your Google Sheet is shared as **"Anyone with the link can view"**:
1. Open the Google Sheet
2. Click **Share** (top right)
3. Under "General access", change from "Restricted" to **"Anyone with the link"**
4. Role should be **"Viewer"**

If this isn't done, the Edge Function will return a 403 error with a clear message.

