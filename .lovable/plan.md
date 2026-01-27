

# Add AI Chatbot Widget to Sidebar

## Overview

Add a collapsible AI chatbot widget to the left sidebar that allows users to ask questions about their dashboard data and get quick, contextual AI-powered responses. The chatbot will use Lovable AI (already configured with `LOVABLE_API_KEY`) to provide insights based on the current data context.

---

## Design Approach

### Widget Location & Behavior
- Positioned between the navigation and footer sections of the sidebar
- Starts collapsed (shows only a "Ask AI" button)
- Expands to show a compact chat interface when clicked
- Can be minimized back to the collapsed state

### Visual Design
- Matches the existing design system (Inter font, violet primary colors, rounded corners)
- Compact input field with send button
- Chat messages in scrollable area (max height ~200px to fit in sidebar)
- AI responses rendered with markdown support
- Loading indicator while AI is thinking

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/dashboard/AIChatWidget.tsx` | Main chat widget component with UI and state management |
| `supabase/functions/ai-chat/index.ts` | Edge function to handle AI requests with data context |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/Sidebar.tsx` | Add the AIChatWidget between nav and footer |
| `src/i18n/translations.ts` | Add translation keys for chat UI |
| `supabase/config.toml` | Register the new edge function |

---

## Technical Implementation

### 1. Edge Function: `ai-chat`

The edge function will:
- Receive the user's question and current data summary
- Build a context-rich prompt about the fashion dashboard data
- Call Lovable AI with the context
- Stream the response back to the client

```typescript
// supabase/functions/ai-chat/index.ts
const systemPrompt = `You are a helpful analytics assistant for Fashion Pulse, 
a fashion brand dashboard. You help users understand their revenue, spend, 
orders, ROAS, and marketing performance data. Be concise and specific.

Current data context:
{context}

Answer questions about this data. Use numbers when relevant. Keep responses 
under 100 words for quick insights.`;
```

### 2. Chat Widget Component

The widget will have three states:
1. **Collapsed**: Just a button with sparkles icon
2. **Expanded**: Shows chat input and message history
3. **Loading**: Shows typing indicator while waiting for AI

```typescript
// Component structure
function AIChatWidget() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Get current data for context
  const { metrics } = useFilteredData();
  
  // Build data summary for AI context
  const dataContext = useMemo(() => buildDataSummary(metrics), [metrics]);
  
  const sendMessage = async () => {
    // Add user message
    // Call edge function with question + context
    // Stream and display AI response
  };
}
```

### 3. Data Context Builder

Create a helper function that summarizes current dashboard data:

```typescript
function buildDataSummary(metrics: DailyMetrics[]) {
  const totals = {
    revenue: sum(metrics, 'totalRevenue'),
    spend: sum(metrics, 'totalSpend'),
    orders: sum(metrics, 'orders'),
    roas: revenue / spend,
    aov: revenue / orders,
  };
  
  return `
    Period: ${startDate} to ${endDate}
    Total Revenue: €${totals.revenue.toLocaleString()}
    Total Spend: €${totals.spend.toLocaleString()}
    Orders: ${totals.orders}
    ROAS: ${totals.roas.toFixed(2)}x
    AOV: €${totals.aov.toFixed(2)}
    ...
  `;
}
```

---

## UI Layout in Sidebar

```text
┌─────────────────────────┐
│  🌟 Fashion Pulse       │
│     Intelligence Dash   │
├─────────────────────────┤
│  📊 Command Center      │
│  📈 Revenue Analysis    │
│  📢 Marketing Battle    │
├─────────────────────────┤
│                         │
│  ┌─────────────────┐   │ ← AI Chat Widget (expanded)
│  │ Ask about data  │   │
│  ├─────────────────┤   │
│  │ User: What's... │   │
│  │ AI: Your ROAS...│   │
│  ├─────────────────┤   │
│  │ [Type message]  │   │
│  └─────────────────┘   │
│                         │
├─────────────────────────┤
│  🟢 Live  ⚙️ 🌐        │
└─────────────────────────┘
```

---

## Example Interactions

**User**: "How is ROAS performing?"
**AI**: "Your current ROAS is 5.2x, which is excellent (target: 5x). Facebook ROAS is 4.8x while Google is at 5.6x, making Google your better performer this period."

**User**: "Compare web vs app"  
**AI**: "Web revenue is €85,200 (68%) vs App at €39,800 (32%). Web dominates but App shows strong engagement with higher AOV (€89 vs €76)."

---

## Translation Keys

```typescript
// English
aiChat: {
  askAI: 'Ask AI',
  placeholder: 'Ask about your data...',
  thinking: 'Thinking...',
  error: 'Failed to get response',
}

// Dutch
aiChat: {
  askAI: 'Vraag AI',
  placeholder: 'Vraag over je data...',
  thinking: 'Aan het denken...',
  error: 'Kon geen antwoord krijgen',
}
```

---

## Implementation Order

1. Create the edge function `supabase/functions/ai-chat/index.ts`
2. Update `supabase/config.toml` to register the function
3. Create `src/components/dashboard/AIChatWidget.tsx`
4. Update `src/i18n/translations.ts` with chat translations
5. Update `src/components/dashboard/Sidebar.tsx` to include the widget

---

## Security Considerations

- The edge function uses server-side `LOVABLE_API_KEY` (already configured)
- Data context is built from already-filtered dashboard data
- No raw API keys are exposed to the client
- Rate limiting handled by Lovable AI gateway

