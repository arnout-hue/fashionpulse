

# Secure Google Sheet Proxy via Supabase Edge Function

## Overview

Create a server-side proxy to fetch Google Sheet data, bypassing browser CORS restrictions while keeping data private. Incorporates the critical security fix to prevent open proxy abuse.

## Architecture

```text
┌─────────────┐       ┌──────────────────────┐       ┌──────────────┐
│   Browser   │──────▶│  Edge Function       │──────▶│ Google Sheet │
│  (Frontend) │       │  /fetch-google-sheet │       │   (gviz API) │
└─────────────┘       └──────────────────────┘       └──────────────┘
     No CORS              Server-to-Server              Private Data
     issues!              (Sheet ID from ENV)           (view only)
```

## Security Design

**Problem**: Accepting `sheetId` from client creates an open proxy that anyone could abuse to scrape any Google Sheet using your server.

**Solution**: Store the Sheet ID as a Supabase Secret (environment variable). The Edge Function only accepts `sheetName` from the client (to fetch different tabs like "Daily_Input" or "Targets").

---

## Implementation Steps

### Step 1: Add Secret for Google Sheet ID

Before creating the Edge Function, we need to store the Google Sheet ID as a secret. This will prompt you to enter the Sheet ID securely.

**Secret Name:** `GOOGLE_SHEET_ID`
**Value:** Your Google Sheet ID (e.g., `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`)

---

### Step 2: Create Supabase Integration Files

**New File:** `src/integrations/supabase/client.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase environment variables not set. Edge function proxy will not work.');
}

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
```

---

### Step 3: Create Edge Function (Secured)

**New File:** `supabase/functions/fetch-google-sheet/index.ts`

```typescript
import { Hono } from 'https://deno.land/x/hono@v3.4.1/mod.ts'

const app = new Hono()

// Sheet ID from Supabase Secrets - NOT from client request
const SHEET_ID = Deno.env.get('GOOGLE_SHEET_ID')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

app.options('*', (c) => new Response(null, { headers: corsHeaders }))

app.post('/', async (c) => {
  try {
    // Only accept sheetName from client (which tab to fetch)
    const { sheetName = 'Daily_Input' } = await c.req.json()
    
    if (!SHEET_ID) {
      console.error('GOOGLE_SHEET_ID environment variable not set')
      return c.json({ error: 'Server misconfiguration: No Sheet ID configured' }, 500)
    }
    
    // Validate sheetName to prevent injection
    const allowedSheets = ['Daily_Input', 'Targets']
    const sanitizedSheetName = allowedSheets.includes(sheetName) ? sheetName : 'Daily_Input'
    
    console.log(`Fetching sheet: ${SHEET_ID}, tab: ${sanitizedSheetName}`)
    
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sanitizedSheetName)}`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      console.error(`Google returned ${response.status}: ${response.statusText}`)
      return c.json({ 
        error: `Failed to fetch sheet: ${response.status}` 
      }, response.status)
    }
    
    const csv = await response.text()
    console.log(`Successfully fetched ${csv.length} bytes`)
    
    return new Response(csv, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Edge function error:', error)
    return c.json({ error: error.message }, 500)
  }
})

Deno.serve(app.fetch)
```

**Key Security Features:**
- `SHEET_ID` comes from environment variable, not client
- `sheetName` is validated against an allowlist
- Detailed logging for debugging

---

### Step 4: Configure Edge Function

**New File:** `supabase/config.toml`

```toml
project_id = ""

[functions.fetch-google-sheet]
verify_jwt = false
```

---

### Step 5: Update Data Fetcher to Use Edge Function

**File:** `src/utils/dataHarmonizer.ts`

Update `fetchGoogleSheetCSV` to use the Edge Function with fallback:

```typescript
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetch and parse Google Sheet as CSV
 * Primary: Uses Supabase Edge Function (bypasses CORS)
 * Fallback: Direct fetch (may fail due to CORS)
 */
export async function fetchGoogleSheetCSV(
  sheetId: string,  // Kept for fallback compatibility
  sheetName: string = 'Daily_Input'
): Promise<Record<string, string>[]> {
  
  // Try Edge Function first (bypasses CORS, uses server-side Sheet ID)
  if (supabase) {
    try {
      console.log(`Fetching via Edge Function: ${sheetName}`);
      
      const { data, error } = await supabase.functions.invoke('fetch-google-sheet', {
        body: { sheetName },
      });
      
      if (error) {
        console.warn('Edge Function error:', error);
        throw error;
      }
      
      // Edge function returns CSV text directly
      if (typeof data === 'string') {
        return parseCSV(data);
      }
      
      // If it returned an error object
      if (data?.error) {
        throw new Error(data.error);
      }
      
      throw new Error('Unexpected response format from Edge Function');
    } catch (e) {
      console.warn('Edge Function failed, trying direct fetch:', e);
    }
  }
  
  // Fallback to direct fetch (may fail due to CORS)
  console.log(`Fallback: Direct fetch for ${sheetName}`);
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 403 || response.status === 401) {
      throw new Error(`Access denied. Make sure the sheet is shared as "Anyone with the link can view".`);
    }
    throw new Error(`Failed to fetch sheet "${sheetName}": ${response.statusText}`);
  }
  
  const csv = await response.text();
  return parseCSV(csv);
}
```

---

### Step 6: Add Retry Logic with Exponential Backoff

**File:** `src/hooks/useFashionData.ts`

Update the query configuration:

```typescript
const query = useQuery({
  queryKey: ['fashion-data', googleSheetId],
  queryFn: async (): Promise<HarmonizedData> => {
    // ... existing code
  },
  staleTime,
  refetchOnWindowFocus: false,
  enabled: !!googleSheetId,
  retry: 3,  // Increase from 1 to 3
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
});
```

---

### Step 7: Update Settings Dialog

**File:** `src/components/dashboard/SettingsDialog.tsx`

The Settings Dialog currently stores Sheet ID client-side. After this change:
- The Edge Function uses the server-side `GOOGLE_SHEET_ID` secret
- The client-side Sheet ID is only used as a fallback

Update the description to clarify this:

```typescript
<DialogDescription>
  Your data is fetched securely via a server-side proxy.
  The fallback Sheet ID is only used if the proxy is unavailable.
</DialogDescription>
```

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/integrations/supabase/client.ts` | Create | Supabase client for Edge Function calls |
| `supabase/functions/fetch-google-sheet/index.ts` | Create | Secure Edge Function proxy |
| `supabase/config.toml` | Create | Edge Function configuration |
| `src/utils/dataHarmonizer.ts` | Modify | Use Edge Function with fallback |
| `src/hooks/useFashionData.ts` | Modify | Add retry logic with backoff |
| `src/components/dashboard/SettingsDialog.tsx` | Modify | Update description text |

---

## Setup Required

Before the Edge Function can work, you'll need to:

1. **Add the `GOOGLE_SHEET_ID` secret** - I'll prompt you to add this
2. **Ensure Supabase is connected** - The project needs Cloud/Supabase for Edge Functions

---

## Security Checklist

- [x] Sheet ID stored server-side as environment variable
- [x] Client can only specify tab name (Daily_Input, Targets)
- [x] Tab names validated against allowlist
- [x] No open proxy vulnerability
- [x] Sheet remains private ("Anyone with link can view")
- [x] Detailed logging for debugging

