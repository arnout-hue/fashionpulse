

# Fix Overlapping Event Annotation Titles

## Problem

When multiple events occur on dates that are close together, their titles overlap because all labels are rendered at the same y-position (`y=20`). The screenshot shows "Grande S..." and "Selectiedrop Week 2" overlapping.

---

## Solution

Implement **dynamic vertical staggering** for event labels based on their proximity to neighboring events. Events that are close together will have their labels rendered at different vertical offsets.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/charts/SmartTrendChart.tsx` | Add proximity detection and stagger logic for event labels |

---

## Implementation Approach

### Step 1: Calculate Label Positions Before Rendering

Before rendering event markers, pre-calculate each event's vertical offset based on:
1. Distance to the previous event (in pixels or data points)
2. Assign alternating "lanes" (y-offsets) to nearby events

```typescript
// In SmartTrendChart component, before rendering events
const eventsWithOffsets = useMemo(() => {
  const MIN_DISTANCE_PX = 80; // Minimum pixel distance before staggering
  
  return events.map((event, index) => {
    let yOffset = 0; // Default position (top)
    
    // Check distance to previous events
    for (let i = 0; i < index; i++) {
      const prevEvent = events[i];
      const daysDiff = Math.abs(
        (event.date.getTime() - prevEvent.date.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // If events are within ~3 days, stagger them
      if (daysDiff <= 3) {
        // Alternate between 3-4 vertical lanes
        yOffset = ((index - i) % 3) * 14; // 14px spacing between lanes
      }
    }
    
    return { ...event, yOffset };
  });
}, [events]);
```

### Step 2: Update CustomEventLabel Component

Modify the label component to accept and use the `yOffset` prop:

```typescript
interface CustomEventLabelProps {
  viewBox?: { x: number; y: number; height?: number };
  event: EventAnnotation;
  color: string;
  chartHeight: number;
  yOffset: number; // NEW: vertical offset for staggering
  onMouseEnter: (event: EventAnnotation, x: number, y: number) => void;
  onMouseLeave: () => void;
}

function CustomEventLabel({ 
  viewBox, 
  event, 
  color, 
  chartHeight, 
  yOffset, // NEW
  onMouseEnter, 
  onMouseLeave 
}: CustomEventLabelProps) {
  // ...
  
  // Apply offset to the title position
  const titleY = 20 + yOffset; // Staggered position
  
  return (
    <g>
      {/* Event title - now with dynamic y position */}
      <g transform={`translate(${viewBox.x + 4}, ${titleY})`}>
        <text ...>{event.title}</text>
      </g>
      {/* ... brand badge unchanged ... */}
    </g>
  );
}
```

### Step 3: Pass yOffset to ReferenceLine Labels

Update the ReferenceLine mapping to pass the calculated offset:

```typescript
{eventsWithOffsets.map((event, index) => {
  // ... existing matching logic ...
  
  return (
    <ReferenceLine
      key={`event-${index}`}
      x={eventDateStr}
      stroke={eventColor}
      strokeDasharray="4 4"
      strokeWidth={1.5}
      label={(props: any) => (
        <CustomEventLabel
          viewBox={props.viewBox}
          event={event}
          color={eventColor}
          chartHeight={height}
          yOffset={event.yOffset} // NEW
          onMouseEnter={(e, x, y) => setHoveredEvent({ event: e, x, y })}
          onMouseLeave={() => setHoveredEvent(null)}
        />
      )}
    />
  );
})}
```

---

## Visual Result

**Before:**
```text
     |Grande SSelectiedrop Week 2
     |         |
-----|---------|--------- (overlapping titles)
```

**After:**
```text
     |Grande S
     |         |Selectiedrop Week 2
-----|---------|--------- (staggered titles)
```

Events within 3 days of each other will have their labels offset vertically in alternating lanes:
- Lane 0: y = 20px (default)
- Lane 1: y = 34px (offset +14px)
- Lane 2: y = 48px (offset +28px)

---

## Technical Details

### Proximity Detection Algorithm

```typescript
const eventsWithOffsets = useMemo(() => {
  // Sort events by date to ensure consistent ordering
  const sorted = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  const result: Array<EventAnnotation & { yOffset: number }> = [];
  const usedLanes: Map<number, number> = new Map(); // dateIndex -> lane
  
  sorted.forEach((event, index) => {
    let lane = 0;
    
    // Check previous events within proximity window
    for (let i = index - 1; i >= 0; i--) {
      const prevEvent = sorted[i];
      const daysDiff = Math.abs(
        (event.date.getTime() - prevEvent.date.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysDiff <= 4) {
        // This event is close to a previous one
        const prevLane = usedLanes.get(i) || 0;
        lane = (prevLane + 1) % 3; // Cycle through 3 lanes
      } else {
        break; // No more nearby events
      }
    }
    
    usedLanes.set(index, lane);
    result.push({ ...event, yOffset: lane * 14 });
  });
  
  return result;
}, [events]);
```

### Edge Cases Handled

1. **Single event**: No offset applied, renders at default position
2. **Two close events**: Second event drops down one lane
3. **Three+ close events**: Events cycle through lanes (0, 1, 2, 0, 1, ...)
4. **Events far apart**: Each renders at default position (lane 0)

---

## Summary

This change adds smart vertical staggering to event labels without changing the visual style. Labels for nearby events will automatically cascade downward, preventing text overlap while maintaining readability.

