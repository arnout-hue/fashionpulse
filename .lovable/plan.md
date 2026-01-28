

# Brand Benchmarking with Podium View

## Overview

Add a new "Brand Benchmarking" page to the dashboard that compares all brands head-to-head. The page will feature a "Podium View" showing three ranked horizontal bar charts for Revenue, ROAS, and Growth - gamifying the data with clear 1st, 2nd, 3rd place rankings.

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/types/index.ts` | Modify | Add `BrandBenchmarkPoint` interface |
| `src/utils/analytics.ts` | Modify | Add `calculateBrandBenchmarks()` function |
| `src/components/charts/BrandPodium.tsx` | Create | Three synchronized ranked bar charts |
| `src/components/pages/BrandBenchmarking.tsx` | Create | Main page with summary cards + podium view + table |
| `src/components/Dashboard.tsx` | Modify | Add 'brands' to page type and render component |
| `src/components/dashboard/Sidebar.tsx` | Modify | Add navigation item with Award icon |
| `src/i18n/translations.ts` | Modify | Add EN and NL translations |

---

## Data Structure

### BrandBenchmarkPoint Type

```typescript
export interface BrandBenchmarkPoint {
  label: string;           // Brand name (e.g., "FMH.NL")
  revenue: number;         // Total revenue for period
  spend: number;           // Total ad spend
  roas: number;            // Revenue / Spend
  orders: number;          // Total orders
  aov: number;             // Average order value
  growthPercentage: number; // YoY or period-over-period growth %
  growthValue: number;     // Absolute growth in revenue
}
```

### Analytics Function Logic

```typescript
export function calculateBrandBenchmarks(
  currentMetrics: DailyMetrics[],
  comparisonMetrics: DailyMetrics[] = []
): BrandBenchmarkPoint[] {
  // 1. Group metrics by label (brand)
  // 2. Aggregate: revenue, spend, orders per brand
  // 3. Calculate derived: ROAS = revenue/spend, AOV = revenue/orders
  // 4. Calculate growth vs comparison period
  // 5. Return sorted by revenue descending
}
```

---

## Visual Design

### Podium Layout (Three Columns)

```text
+---------------------+---------------------+---------------------+
|      REVENUE        |        ROAS         |       GROWTH        |
+---------------------+---------------------+---------------------+
| 1. FMH.NL   EUR285K | 1. JURK     6.2x    | 1. FMH.DE    +45%   |
| [================]  | [================]  | [================]  |
|                     |                     |                     |
| 2. FMH.BE   EUR142K | 2. FMH.NL   5.1x    | 2. FMH.NL    +12%   |
| [========]          | [============]      | [========]          |
|                     |                     |                     |
| 3. JURK     EUR89K  | 3. FMH.DE   4.8x    | 3. FMH.BE    +8%    |
| [=====]             | [==========]        | [======]            |
|                     |                     |                     |
| 4. FMH.DE   EUR45K  | 4. FMH.BE   3.9x    | 4. JURK      -5%    |
| [==] (faded)        | [========] (faded)  | [-] (red, faded)    |
+---------------------+---------------------+---------------------+
```

**Visual Features:**
- Top 3 positions: full opacity (100%)
- Position 4+: faded (30% opacity)
- Revenue bars: Violet (primary color)
- ROAS bars: Emerald/profit green
- Growth bars: Green for positive, Red for negative
- Each bar shows brand name and formatted value

### Page Layout

```text
+------------------------------------------------------------------+
|  BRAND BENCHMARKING                                              |
|  Compare all brands head-to-head                                 |
+------------------------------------------------------------------+
|                                                                  |
|  +----------------+  +----------------+  +----------------+      |
|  | Top Revenue    |  | Best ROAS      |  | Highest Growth |      |
|  | FMH.NL         |  | JURK           |  | FMH.DE         |      |
|  | EUR285,420     |  | 6.2x           |  | +45.2%         |      |
|  +----------------+  +----------------+  +----------------+      |
|                                                                  |
|  +------------------------------------------------------------+  |
|  |                     THE PODIUM                             |  |
|  |  [Three-column bar chart visualization]                    |  |
|  +------------------------------------------------------------+  |
|                                                                  |
|  +------------------------------------------------------------+  |
|  |                  DETAILED BREAKDOWN                        |  |
|  |  Brand  | Revenue | Spend  | ROAS | Orders | AOV  | Growth |  |
|  |  FMH.NL | EUR285K | EUR56K | 5.1x | 2,845  | EUR100| +12%  |  |
|  |  FMH.BE | EUR142K | EUR36K | 3.9x | 1,422  | EUR100| +8%   |  |
|  |  ...    | ...     | ...    | ...  | ...    | ...  | ...   |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
```

---

## Implementation Steps

### Step 1: Add Types (`src/types/index.ts`)

Add the `BrandBenchmarkPoint` interface after the existing chart types section.

### Step 2: Add Analytics Function (`src/utils/analytics.ts`)

Add helper function `aggregateMetricsByLabel()` and main function `calculateBrandBenchmarks()`:
- Group all daily metrics by brand label
- Sum revenue, spend, orders per brand
- Calculate ROAS (revenue/spend) and AOV (revenue/orders)
- If comparison data exists, calculate growth percentage
- Handle edge cases: new brands with no previous data get 100% growth

### Step 3: Create BrandPodium Component (`src/components/charts/BrandPodium.tsx`)

Using Recharts `BarChart` with horizontal layout:
- Accept `BrandBenchmarkPoint[]` as data
- Sort data three ways: byRevenue, byRoas, byGrowth
- Render three `ResponsiveContainer` columns
- Use `Cell` for conditional bar coloring and opacity
- Show formatted values on bars using `LabelList`
- Custom tooltips showing brand name and value

### Step 4: Create BrandBenchmarking Page (`src/components/pages/BrandBenchmarking.tsx`)

Following the pattern from `RevenueDeepDive.tsx`:
- Use `useFilteredData()` to get metrics and allMetrics
- Use `useDashboardStore()` for filter state
- Calculate comparison metrics using same logic as RevenueDeepDive
- Call `calculateBrandBenchmarks()` with both periods
- Find winners for summary cards (top revenue, best ROAS, highest growth)
- Render:
  - Summary cards (3 winners)
  - BrandPodium chart
  - Detailed table with all metrics

### Step 5: Update Dashboard (`src/components/Dashboard.tsx`)

- Add `'brands'` to the `Page` type union
- Add `brands` config to `pageConfig` object
- Add conditional render for `<BrandBenchmarking />`
- Import the new component

### Step 6: Update Sidebar (`src/components/dashboard/Sidebar.tsx`)

- Import `Award` icon from lucide-react
- Add nav item: `{ id: 'brands', label: t.sidebar.brandBenchmarking, icon: Award }`

### Step 7: Add Translations (`src/i18n/translations.ts`)

Add to both `en` and `nl` objects:
- `sidebar.brandBenchmarking`
- `pages.brands.title` and `pages.brands.subtitle`
- `brandBenchmarking.*` keys for all UI text

---

## Color Scheme

| Element | Color | CSS/Value |
|---------|-------|-----------|
| Revenue bars | Violet | `hsl(var(--primary))` |
| ROAS bars | Emerald | `#10b981` or `hsl(var(--profit))` |
| Growth positive | Green | `#10b981` |
| Growth negative | Red | `#ef4444` |
| Faded bars (4th+) | Same color | 30% opacity |
| ROAS >= 5 | Green text | `text-profit` |
| ROAS < 5 | Default text | |
| Growth >= 0 | Green text | `text-profit` |
| Growth < 0 | Red text | `text-spend` |

---

## Technical Notes

- Reuses existing data hooks (`useFilteredData`, `useDashboardStore`)
- Follows same comparison period logic as RevenueDeepDive for accurate growth numbers
- No new dependencies required
- Fully supports existing i18n system
- Responds to label filter changes (shows only selected brands)
- Responds to date range changes

