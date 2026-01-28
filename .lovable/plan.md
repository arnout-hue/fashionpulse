

# Event Annotations Enhancement

## Overview

Enhance the event markers on charts to:
1. Display a visible brand flag/badge (with abbreviations: FMH.NL, FMH.BE, FMH.DE, JURK)
2. Show the event description on hover via a custom tooltip

---

## Brand Label Mapping

| Sheet Value | Display Abbreviation |
|-------------|---------------------|
| fashionmusthaves.nl | FMH.NL |
| fashionmusthaves.be | FMH.BE |
| fashionmusthaves.de | FMH.DE |
| jurkjes.com | JURK |
| FMH.NL | FMH.NL |
| FMH.BE | FMH.BE |
| (empty) | (no badge) |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/charts/SmartTrendChart.tsx` | Custom event label with brand badge + hover tooltip |
| `src/utils/dataHarmonizer.ts` | Add brand abbreviation mapping function |

---

## Implementation Details

### 1. Add Brand Abbreviation Helper (`src/utils/dataHarmonizer.ts`)

Add a utility function to convert full brand names to abbreviations:

```typescript
export function getBrandAbbreviation(label?: string): string | null {
  if (!label) return null;
  
  const normalized = label.toLowerCase().trim();
  
  const mapping: Record<string, string> = {
    'fashionmusthaves.nl': 'FMH.NL',
    'fashionmusthaves.be': 'FMH.BE', 
    'fashionmusthaves.de': 'FMH.DE',
    'jurkjes.com': 'JURK',
    'fmh.nl': 'FMH.NL',
    'fmh.be': 'FMH.BE',
    'fmh.de': 'FMH.DE',
    'jurk': 'JURK',
  };
  
  return mapping[normalized] || label.toUpperCase();
}
```

### 2. Custom Event Label Component (`src/components/charts/SmartTrendChart.tsx`)

Create a custom SVG label component that:
- Shows the event title
- Shows a small brand badge if label is present
- Includes hover state tracking for tooltip

```typescript
interface CustomEventLabelProps {
  viewBox?: { x: number; y: number };
  event: EventAnnotation;
  color: string;
  onMouseEnter: (event: EventAnnotation, x: number, y: number) => void;
  onMouseLeave: () => void;
}

function CustomEventLabel({ viewBox, event, color, onMouseEnter, onMouseLeave }: CustomEventLabelProps) {
  if (!viewBox) return null;
  
  const brandAbbr = getBrandAbbreviation(event.label);
  const displayText = brandAbbr ? `${event.title} [${brandAbbr}]` : event.title;
  
  return (
    <g 
      transform={`translate(${viewBox.x + 4}, 20)`}
      style={{ cursor: 'pointer' }}
      onMouseEnter={() => onMouseEnter(event, viewBox.x, 20)}
      onMouseLeave={onMouseLeave}
    >
      {/* Event title */}
      <text
        fill={color}
        fontSize={10}
        fontWeight={500}
        textAnchor="start"
      >
        {event.title}
      </text>
      
      {/* Brand badge */}
      {brandAbbr && (
        <g transform={`translate(${event.title.length * 5 + 4}, -8)`}>
          <rect
            width={brandAbbr.length * 6 + 6}
            height={12}
            rx={3}
            fill={color}
            opacity={0.15}
          />
          <text
            x={3}
            y={9}
            fill={color}
            fontSize={8}
            fontWeight={600}
          >
            {brandAbbr}
          </text>
        </g>
      )}
    </g>
  );
}
```

### 3. Event Hover Tooltip (`src/components/charts/SmartTrendChart.tsx`)

Add state for hovered event and a floating tooltip component:

```typescript
// In SmartTrendChart component
const [hoveredEvent, setHoveredEvent] = useState<{
  event: EventAnnotation;
  x: number;
  y: number;
} | null>(null);

// Event tooltip component
{hoveredEvent && (
  <div
    className="absolute z-50 bg-card border border-border rounded-lg shadow-xl p-3 max-w-[200px] pointer-events-none"
    style={{
      left: hoveredEvent.x + 10,
      top: hoveredEvent.y + 30,
    }}
  >
    <p className="font-medium text-sm" style={{ color: getEventColor(hoveredEvent.event.type) }}>
      {hoveredEvent.event.title}
    </p>
    {hoveredEvent.event.label && (
      <p className="text-xs text-muted-foreground mt-1">
        {getBrandAbbreviation(hoveredEvent.event.label)}
      </p>
    )}
    {hoveredEvent.event.description && (
      <p className="text-xs text-muted-foreground mt-2">
        {hoveredEvent.event.description}
      </p>
    )}
    <p className="text-xs text-muted-foreground mt-1">
      {format(hoveredEvent.event.date, 'MMM d, yyyy')}
    </p>
  </div>
)}
```

### 4. Updated ReferenceLine Rendering

Update the event markers to use the custom label:

```typescript
{events.map((event, index) => {
  const eventDateStr = format(event.date, 'MMM d');
  const matchingData = data.find(d => d.displayDate === eventDateStr);
  if (!matchingData) return null;
  
  return (
    <ReferenceLine
      key={`event-${index}`}
      x={eventDateStr}
      stroke={getEventColor(event.type)}
      strokeDasharray="4 4"
      strokeWidth={1.5}
      label={(props) => (
        <CustomEventLabel
          {...props}
          event={event}
          color={getEventColor(event.type)}
          onMouseEnter={(e, x, y) => setHoveredEvent({ event: e, x, y })}
          onMouseLeave={() => setHoveredEvent(null)}
        />
      )}
    />
  );
})}
```

---

## Visual Design

```text
Chart with Event Markers:

        ┌─────────────────────────────────────────────┐
        │  Black Friday [FMH.NL]     Server Down      │  ← Event labels at top
        │     ┆                           ┆           │
        │  ╭──┆───────────────────────────┆──────╮    │
        │  │  ┆                           ┆      │    │
   €100k├──│──┆───────────────────────────┆──────│────│
        │  │  ┆      /\                   ┆      │    │
        │  │  ┆     /  \                  ┆      │    │
    €50k├──│──┆────/────\─────────────────┆──────│────│
        │  │  ┆   /      \_____/\         ┆      │    │
        │  ╰──┆──/──────────────────\─────┆──────╯    │
        └─────┴───────────────────────────┴───────────┘
              ↑ Green dashed line         ↑ Red dashed line
              (promotion)                 (technical issue)
              
Hover Tooltip:
┌─────────────────────┐
│ Black Friday        │
│ FMH.NL              │
│                     │
│ Site-wide 30% sale  │  ← Description from sheet
│ Nov 29, 2025        │
└─────────────────────┘
```

---

## Color Legend (Confirmed)
- **Green** (`#10b981`): Promotions/Marketing events
- **Red** (`#ef4444`): Technical issues
- **Amber** (`#f59e0b`): Seasonality/Calendar/Holiday events
- **Indigo** (`#6366f1`): Other events

---

## Implementation Order

1. Add `getBrandAbbreviation()` utility function to `dataHarmonizer.ts`
2. Create `CustomEventLabel` SVG component in `SmartTrendChart.tsx`
3. Add hover state and tooltip component
4. Update ReferenceLine to use custom label with hover handlers
5. Test with sample events containing labels and descriptions

---

## Google Sheet Events Tab Format (Reminder)

| Date | Title | Description | Type | Label |
|------|-------|-------------|------|-------|
| 29-11-2025 | Black Friday | Site-wide 30% sale | marketing | fashionmusthaves.nl |
| 5-12-2025 | Server Down | 2h outage | technical | |
| 25-12-2025 | Christmas | Office closed | holiday | |

