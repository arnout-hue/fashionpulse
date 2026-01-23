import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format, startOfMonth, endOfMonth, subMonths, subDays, startOfYear } from "date-fns"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
  date: DateRange
  setDate: (date: DateRange) => void
  className?: string
}

export function DateRangePicker({
  date,
  setDate,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)

  const presets = [
    {
      label: "Today",
      getValue: () => ({ from: new Date(), to: new Date() }),
    },
    {
      label: "Yesterday",
      getValue: () => ({ from: subDays(new Date(), 1), to: subDays(new Date(), 1) }),
    },
    {
      label: "Last 7 Days",
      getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }),
    },
    {
      label: "Last 30 Days",
      getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }),
    },
    {
      label: "This Month",
      getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }),
    },
    {
      label: "Last Month",
      getValue: () => ({ 
        from: startOfMonth(subMonths(new Date(), 1)), 
        to: endOfMonth(subMonths(new Date(), 1)) 
      }),
    },
    {
      label: "This Year",
      getValue: () => ({ from: startOfYear(new Date()), to: new Date() }),
    },
  ]

  const handlePresetSelect = (label: string) => {
    const preset = presets.find((p) => p.label === label)
    if (preset) {
      const newRange = preset.getValue()
      setDate(newRange)
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-auto justify-start text-left font-normal gap-2 bg-secondary border-0 hover:bg-secondary/80",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "MMM d, yyyy")} - {format(date.to, "MMM d, yyyy")}
                </>
              ) : (
                format(date.from, "MMM d, yyyy")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0 pointer-events-auto" 
          align="end"
          sideOffset={8}
        >
          <div className="flex">
            {/* Sidebar with Presets */}
            <div className="flex flex-col gap-1 border-r border-border p-3 min-w-[140px]">
              <p className="text-xs font-medium text-muted-foreground mb-2 px-2">
                Presets
              </p>
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="justify-start text-sm font-normal h-8"
                  onClick={() => handlePresetSelect(preset.label)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Calendar Area */}
            <div className="p-3">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={(newDate) => {
                  if (newDate) setDate(newDate);
                }}
                numberOfMonths={2}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
