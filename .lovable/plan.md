
# Fix Google Sheet Data Fetching

## Problem Summary
The current implementation uses the `/export?format=csv` endpoint which requires the sheet to be **"Published to Web"**. This is causing CORS errors when users paste regular Google Sheet URLs (`/edit?usp=sharing`).

## Solution
Switch to the **gviz API** endpoint (`/gviz/tq?tqx=out:csv`) which works with sheets that are simply shared as "Anyone with the link can view" without needing "Publish to Web". Also fetch sheets by **tab name** instead of numeric gid.

---

## Implementation Plan

### 1. Update `src/utils/dataHarmonizer.ts`

**Changes:**
- Modify `fetchGoogleSheetCSV` to use the gviz API endpoint
- Change parameter from `gid` to `sheetName` for fetching by tab name
- Add better error handling for CORS/permission issues

```text
Current:
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

New:
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
```

**Function signature change:**
```typescript
// Before
fetchGoogleSheetCSV(sheetId: string, gid: string = '0')

// After
fetchGoogleSheetCSV(sheetId: string, sheetName: string = 'Daily_Input')
```

### 2. Update `src/hooks/useFashionData.ts`

**Changes:**
- Update fetch calls to use sheet names instead of gids:
  - `'Daily_Input'` for main data (was `'0'`)
  - `'Targets'` for targets data (was `'1'`)
- Improve error messages to guide users on permissions

```typescript
// Before
const liveData = await fetchGoogleSheetCSV(googleSheetId, '0');
const targetsData = await fetchGoogleSheetCSV(googleSheetId, '1');

// After
const liveData = await fetchGoogleSheetCSV(googleSheetId, 'Daily_Input');
const targetsData = await fetchGoogleSheetCSV(googleSheetId, 'Targets');
```

### 3. Update `src/components/dashboard/SettingsDialog.tsx`

**Changes:**
- Update instructions to clarify:
  - Sheet must be "Anyone with the link can view"
  - Tab names must be exactly `Daily_Input` and `Targets`
- Add note about the gviz API advantage (no "Publish to Web" needed)

---

## Technical Details

### Why gviz API?
| Feature | `/export?format=csv` | `/gviz/tq?tqx=out:csv` |
|---------|---------------------|------------------------|
| Requires "Publish to Web" | Yes | No |
| Works with "Anyone with link" | No | Yes |
| Fetch by tab name | No (uses gid) | Yes |
| CORS-friendly | Less reliable | More reliable |

### Sheet Name Requirements
Users must name their tabs exactly:
- **`Daily_Input`** - Main data with columns: Date, Label, Rev_Web, Rev_App, Orders, Orders_App, Conv_FB, Conv_Google, Spend_FB, Spend_Google
- **`Targets`** (optional) - Monthly targets

---

## Files to Modify

1. **`src/utils/dataHarmonizer.ts`** - Update `fetchGoogleSheetCSV` function
2. **`src/hooks/useFashionData.ts`** - Update fetch calls to use tab names
3. **`src/components/dashboard/SettingsDialog.tsx`** - Update user instructions
