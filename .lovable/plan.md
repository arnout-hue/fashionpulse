

# Event Annotations & Context Layer

## Overview

Add support for event annotations that appear as vertical markers on charts, helping correlate revenue spikes/drops with business events like "Black Friday", "Server Outage", or "Influencer Post". Events will be fetched from a new "Events" tab in the Google Sheet.

---

## Data Flow

```text
Google Sheet "Events" Tab
         │
         ▼
Edge Function (fetch-google-sheet)
         │
         ▼
DataHarmonizer.addEvents()
         │
         ▼
useFashionData() → HarmonizedData.events
         │
         ▼
useFilteredData() → filteredEvents
         │
         ▼
SmartTrendChart (events prop)
         │
         ▼
ReferenceLine + Custom Label
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/index.ts` | Add `EventSchema`, `EventAnnotation` type, update `HarmonizedData` |
| `src/utils/dataHarmonizer.ts` | Add `addEvents()` method, include events in `harmonize()` output |
| `src/hooks/useFashionData.ts` | Fetch "Events" tab, filter events in `useFilteredData` |
| `src/components/charts/SmartTrendChart.tsx` | Add `events` prop, render as `ReferenceLine` with custom labels |
| `src/components/pages/CommandCenter.tsx` | Pass filtered events to chart |
| `src/components/pages/RevenueDeepDive.tsx` | Pass filtered events to chart |
| `src/i18n/translations.ts` | Add event type labels |

---

## Implementation Details

### 1. Types (`src/types/index.ts`)

Add new Zod schema and TypeScript interfaces:

```typescript
// Event types for color coding
export const EVENT_TYPES = ['marketing', 'technical', 'holiday', 'other'] as const;
export type EventType = typeof EVENT_TYPES[number];

// Zod schema for validation
export const EventSchema = z.object({
  Date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  Title: z.string(),
  Description: z.string().optional(),
  Type: z.enum(['marketing', 'technical', 'holiday', 'other']).default('other'),
  Label: z.string().optional(), // Link event to specific brand
});

export type EventRaw = z.infer<typeof EventSchema>;

// Processed event annotation
export interface EventAnnotation {
  date: Date;
  dateString: string;
  title: string;
  description?: string;
  type: EventType;
  label?: string; // Optional brand filter
}

// Update HarmonizedData to include events
export interface HarmonizedData {
  metrics: DailyMetrics[];
  targets: MonthlyTarget[];
  events: EventAnnotation[];  // NEW
  lastUpdated: Date;
  sources: DataSource[];
}
```

### 2. DataHarmonizer (`src/utils/dataHarmonizer.ts`)

Add event parsing logic:

```typescript
private events: EventAnnotation[] = [];

addEvents(rawData: Record<string, string>[]): { success: number; errors: number } {
  const events: EventAnnotation[] = [];
  let errors = 0;

  for (const row of rawData) {
    try {
      const dateStr = row['Date'] || row['date'];
      if (!dateStr) continue;
      
      // Parse European date format (d-m-yyyy) or ISO format
      let date: Date;
      if (dateStr.includes('-') && dateStr.split('-')[0].length <= 2) {
        // European format: d-m-yyyy
        const [day, month, year] = dateStr.split('-').map(Number);
        date = new Date(year, month - 1, day);
      } else {
        date = new Date(dateStr);
      }
      
      if (isNaN(date.getTime())) {
        errors++;
        continue;
      }

      events.push({
        date,
        dateString: date.toISOString().split('T')[0],
        title: row['Title'] || row['title'] || 'Event',
        description: row['Description'] || row['description'],
        type: (row['Type'] || row['type'] || 'other').toLowerCase() as EventType,
        label: row['Label'] || row['label'],
      });
    } catch {
      errors++;
    }
  }

  this.events = events;
  return { success: events.length, errors };
}

// Update harmonize() to include events
harmonize(fillMissing: boolean = true): HarmonizedData {
  // ... existing logic ...
  return {
    metrics: allMetrics,
    targets: this.targets,
    events: this.events,  // NEW
    lastUpdated: new Date(),
    sources,
  };
}

// Update clear() to reset events
clear(): void {
  // ... existing ...
  this.events = [];
}
```

### 3. Data Hook (`src/hooks/useFashionData.ts`)

Fetch events and filter them:

```typescript
// In useFashionData queryFn, after fetching targets:
try {
  const eventsData = await fetchGoogleSheetCSV('', 'Events');
  if (eventsData.length > 0) {
    harmonizer.addEvents(eventsData);
  }
} catch {
  console.log('No Events tab found (optional)');
}

// In useFilteredData:
const filteredEvents = useMemo(() => {
  if (!harmonizedData?.events) return [];
  
  return harmonizedData.events.filter(e => {
    const date = new Date(e.date);
    // Date range filter
    const inRange = date >= filters.dateRange.start && date <= filters.dateRange.end;
    // Label filter (if event has a specific label, only show if that label is selected)
    const labelMatch = !e.label || 
      filters.labels.length === 0 || 
      filters.labels.includes(e.label);
    return inRange && labelMatch;
  });
}, [harmonizedData, filters.dateRange, filters.labels]);

return {
  // ... existing ...
  events: filteredEvents,  // NEW
};
```

### 4. SmartTrendChart (`src/components/charts/SmartTrendChart.tsx`)

Add event markers as vertical reference lines:

```typescript
import { ReferenceLine, Label as RechartsLabel } from 'recharts';
import { CalendarDays, Megaphone, AlertTriangle, Gift } from 'lucide-react';

interface SmartTrendChartProps {
  // ... existing props ...
  events?: EventAnnotation[];
}

// Helper function for event colors
const getEventColor = (type: EventType): string => {
  switch(type) {
    case 'marketing': return '#10b981'; // green
    case 'technical': return '#ef4444'; // red  
    case 'holiday': return '#f59e0b';   // amber
    default: return '#6366f1';          // indigo
  }
};

// In the chart render:
{events?.map((event, index) => {
  const eventDateStr = format(event.date, 'MMM d');
  // Only render if date exists in chart data
  const matchingData = data.find(d => d.displayDate === eventDateStr);
  if (!matchingData) return null;
  
  return (
    <ReferenceLine
      key={`event-${index}`}
      x={eventDateStr}
      stroke={getEventColor(event.type)}
      strokeDasharray="4 4"
      strokeWidth={1.5}
      label={
        <RechartsLabel
          value={event.title}
          position="insideTopRight"
          fill={getEventColor(event.type)}
          fontSize={10}
          offset={5}
        />
      }
    />
  );
})}
```

### 5. CommandCenter & RevenueDeepDive

Pass events to charts:

```typescript
// CommandCenter.tsx
const { metrics, target, allMetrics, totalRevenueAllLabels, events } = useFilteredData();

<SmartTrendChart 
  data={chartData} 
  events={events}  // NEW
  showYoY={filters.enableYoY || filters.comparisonEnabled}
  // ...
/>

// RevenueDeepDive.tsx - same pattern
```

### 6. Translations (`src/i18n/translations.ts`)

Add event-related labels:

```typescript
events: {
  marketing: 'Marketing',
  technical: 'Technical',
  holiday: 'Holiday',
  other: 'Other',
},
```

---

## Google Sheet Setup

Create a new tab named **"Events"** with columns:

| Date | Title | Description | Type | Label |
|------|-------|-------------|------|-------|
| 29-11-2025 | Black Friday | Site-wide 30% sale | marketing | |
| 5-12-2025 | Server Down | 2h outage | technical | |
| 25-12-2025 | Christmas | Office closed | holiday | |
| 10-1-2026 | Influencer Post | @user collab | marketing | FMH.NL |

- **Type** values: `marketing`, `technical`, `holiday`, `other`
- **Label** is optional - leave empty for all-brand events, or specify a brand (e.g., `FMH.NL`) to show only when that brand is selected

---

## Visual Design

Event markers will appear as:
- Dashed vertical lines at the event date
- Color-coded by type (green=marketing, red=technical, amber=holiday, indigo=other)
- Small label at the top of the line showing the event title
- Hover tooltip showing full description (future enhancement)

---

## Implementation Order

1. Update `src/types/index.ts` with EventAnnotation types
2. Update `src/utils/dataHarmonizer.ts` with addEvents method
3. Update `src/hooks/useFashionData.ts` to fetch and filter events
4. Update `src/components/charts/SmartTrendChart.tsx` to render event markers
5. Update `src/components/pages/CommandCenter.tsx` to pass events
6. Update `src/components/pages/RevenueDeepDive.tsx` to pass events
7. Update `src/i18n/translations.ts` with event labels

---

## Benefits

- **Context for spikes/drops**: Instantly see why revenue changed on specific days
- **Marketing attribution**: Track campaign launch dates against performance
- **Incident tracking**: Document technical issues affecting sales
- **Holiday planning**: Mark seasonal events for YoY comparison context

