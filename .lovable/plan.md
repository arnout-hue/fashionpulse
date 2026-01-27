

# Give AI Access to Granular Daily Data

## Problem

The current AI chatbot context only provides **aggregated totals** for the selected period. When a user asks "What is the app revenue on 20-01-2026 for JURK?", the AI cannot answer because it doesn't have individual day/label data.

## Solution

Enhance the context builder to include a **daily breakdown table** with key metrics per date and label. This will allow the AI to answer questions like:
- "What was revenue for FMH.NL on January 15th?"
- "Compare JURK's spend on the 10th vs 20th"
- "Which day had the highest revenue for all brands?"

---

## Technical Approach

### Option 1: Include Full Daily Data (Selected)

Include a compressed table format in the context with daily data per label. To avoid token limits, we'll:
1. Only include key columns: Date, Label, Revenue, Spend, Orders, App Revenue
2. Use a compact format (one line per day/label)
3. Limit to the current filtered period (already constrained)

### Context Size Considerations

For a typical 30-day period with 4 labels:
- ~120 rows × ~50 chars per row = ~6KB of text
- This is well within LLM context limits

---

## File to Modify

`src/components/dashboard/AIChatWidget.tsx`

### Changes

Update the `dataContext` builder to include daily breakdown:

```typescript
const dataContext = useMemo(() => {
  if (!metrics || metrics.length === 0) return 'No data available.';
  
  // Build summary totals (existing code)
  // ...
  
  // NEW: Build daily data table
  const dailyData = metrics
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(m => {
      const dateStr = format(new Date(m.date), 'd-M-yyyy');
      return `${dateStr} | ${m.label} | Rev: €${m.totalRevenue.toFixed(0)} | App: €${m.revenueApp.toFixed(0)} | Spend: €${m.totalSpend.toFixed(0)} | Orders: ${m.orders}`;
    })
    .join('\n');
  
  return `
Period: ${startDate} to ${endDate}
...existing summary...

Daily Breakdown (Date | Brand | Revenue | App Rev | Spend | Orders):
${dailyData}
  `.trim();
}, [metrics, filters, target]);
```

### Example Output

```
Daily Breakdown (Date | Brand | Revenue | App Rev | Spend | Orders):
1-1-2026 | jurkjes.com | Rev: €5798 | App: €2081 | Spend: €1459 | Orders: 68
1-1-2026 | fashionmusthaves.nl | Rev: €17313 | App: €5118 | Spend: €3225 | Orders: 188
2-1-2026 | jurkjes.com | Rev: €8935 | App: €2375 | Spend: €835 | Orders: 109
...
```

---

## Expected Result

After this change, users can ask:
- "What was JURK's app revenue on January 20th?" → AI can look up the exact row
- "Which day had the highest revenue?" → AI can scan the daily data
- "Compare FMH.NL revenue on the 1st vs 15th" → AI has both data points

---

## Summary

| File | Changes |
|------|---------|
| `src/components/dashboard/AIChatWidget.tsx` | Add daily breakdown table to AI context with Date, Label, Revenue, App Revenue, Spend, and Orders |

