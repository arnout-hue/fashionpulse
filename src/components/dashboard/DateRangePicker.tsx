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
import { useTranslation } from "@/hooks/useTranslation"

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
  const [isSelectingEnd, setIsSelectingEnd] = React.useState(false)
  const { t } = useTranslation()

  const presets = [
    {
      label: t.datePicker.today,
      getValue: () => ({ from: new Date(), to: new Date() }),
    },
    {
      label: t.datePicker.yesterday,
      getValue: () => ({ from: subDays(new Date(), 1), to: subDays(new Date(), 1) }),
    },
    {
      label: t.datePicker.last7Days,
      getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }),
    },
    {
      label: t.datePicker.last30Days,
      getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }),
    },
    {
      label: t.datePicker.thisMonth,
      getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }),
    },
    {
      label: t.datePicker.lastMonth,
      getValue: () => ({ 
        from: startOfMonth(subMonths(new Date(), 1)), 
        to: endOfMonth(subMonths(new Date(), 1)) 
      }),
    },
    {
      label: t.datePicker.thisYear,
      getValue: () => ({ from: startOfYear(new Date()), to: new Date() }),
    },
  ]

  const handlePresetSelect = (label: string) => {
    const preset = presets.find((p) => p.label === label)
    if (preset) {
      const newRange = preset.getValue()
      setDate(newRange)
      setIsSelectingEnd(false)
    }
  }

  const handleDayClick = (day: Date) => {
    // If we have a complete range (both from and to), reset and start new selection
    if (date?.from && date?.to && !isSelectingEnd) {
      setDate({ from: day, to: undefined })
      setIsSelectingEnd(true)
      return
    }
    
    // If we're selecting the end date
    if (isSelectingEnd && date?.from) {
      // If clicked date is before start, swap them
      if (day < date.from) {
        setDate({ from: day, to: date.from })
      } else {
        setDate({ from: date.from, to: day })
      }
      setIsSelectingEnd(false)
      return
    }
    
    // First click - select start date
    setDate({ from: day, to: undefined })
    setIsSelectingEnd(true)
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
              <span>{t.datePicker.pickDate}</span>
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
                {t.datePicker.pickDate}
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
                onDayClick={handleDayClick}
                numberOfMonths={2}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
