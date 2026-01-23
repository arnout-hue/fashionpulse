

# Fix Dashboard Layout

## Problem

The current BentoGrid has layout issues:
- Cards flow incorrectly because the hero card (2x2) doesn't leave space for other cards to position properly
- MER Gauge and AOV Card don't have explicit grid positions
- Channel Split is positioned at column 4 but other cards don't account for the hero taking columns 1-2

## Current Layout (Broken)

```text
Expected:
┌──────────────────┬───────────┬───────────┐
│                  │    MER    │  Channel  │
│   Month Pacing   ├───────────┤   Split   │
│   (Hero 2x2)     │    AOV    │  (Tall)   │
│                  │           │           │
└──────────────────┴───────────┴───────────┘

Actual (cards flowing wrong):
┌──────────────────┬───────────┬───────────┐
│                  │    MER    │  Channel  │
│   Month Pacing   │           │   Split   │
├──────────────────┼───────────┤           │
│        AOV       │   Empty   │           │
└──────────────────┴───────────┴───────────┘
```

## Solution

### File 1: `src/components/dashboard/BentoGrid.tsx`

Update the grid to use explicit row sizing:

```typescript
export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
        'lg:auto-rows-fr', // Equal height rows
        className
      )}
    >
      {children}
    </div>
  );
}
```

### File 2: `src/components/pages/CommandCenter.tsx`

Add explicit grid positioning to all cards:

**MER Gauge** - Position at column 3, row 1:
```typescript
className="lg:col-start-3 lg:row-start-1"
```

**AOV Card** - Position at column 3, row 2:
```typescript
className="lg:col-start-3 lg:row-start-2"
```

**Channel Split** - Already at column 4, add row span:
```typescript
className="lg:col-start-4 lg:row-start-1 lg:row-span-2"
```

### Expected Result

```text
┌──────────────────┬───────────┬───────────┐
│                  │    MER    │  Channel  │
│   Month Pacing   │  Gauge    │   Split   │
│   (col 1-2,      ├───────────┤  (col 4,  │
│    row 1-2)      │    AOV    │  row 1-2) │
│                  │   Card    │           │
└──────────────────┴───────────┴───────────┘
        col 1-2       col 3       col 4
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/BentoGrid.tsx` | Change `auto-rows-min` to `auto-rows-fr` for consistent row heights |
| `src/components/pages/CommandCenter.tsx` | Add explicit `lg:col-start-X lg:row-start-X` to MER Gauge and AOV Card |

