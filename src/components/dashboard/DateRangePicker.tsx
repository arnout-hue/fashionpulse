import * as React from "react"
import { CalendarIcon, ChevronDown } from "lucide-react"
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  subDays, 
  startOfYear, 
  endOfYear,
  differenceInDays, 
  subYears,
  startOfWeek,
  endOfWeek,
  subWeeks,
  startOfQuarter,
  endOfQuarter,
  subQuarters,
} from "date-fns"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useTranslation } from "@/hooks/useTranslation"
import { useDashboardStore } from "@/store/dashboardStore"
import type { ComparisonMode } from "@/types"

interface DateRangePickerProps {
  date: DateRange
  setDate: (date: DateRange) => void
  className?: string
}

interface PresetCategory {
  label: string
  presets: {
    label: string
    getValue: () => DateRange
  }[]
}

export function DateRangePicker({
  date,
  setDate,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [isSelectingEnd, setIsSelectingEnd] = React.useState(false)
  const { t } = useTranslation()
  
  // Get comparison state from store
  const { 
    filters, 
    setComparisonEnabled, 
    setComparisonMode,
    setAlignByDayOfWeek,
  } = useDashboardStore()
  
  // Local state for pending changes (before Apply)
  const [pendingDate, setPendingDate] = React.useState<DateRange>(date)
  const [pendingCompareEnabled, setPendingCompareEnabled] = React.useState(filters.comparisonEnabled)
  const [pendingCompareMode, setPendingCompareMode] = React.useState<ComparisonMode>(filters.comparisonMode)
  const [pendingAlignByDayOfWeek, setPendingAlignByDayOfWeek] = React.useState(filters.alignByDayOfWeek)
  
  // Sync pending state when popover opens
  React.useEffect(() => {
    if (open) {
      setPendingDate(date)
      setPendingCompareEnabled(filters.comparisonEnabled)
      setPendingCompareMode(filters.comparisonMode)
      setPendingAlignByDayOfWeek(filters.alignByDayOfWeek)
    }
  }, [open, date, filters.comparisonEnabled, filters.comparisonMode, filters.alignByDayOfWeek])
  
  // Calculate comparison range based on pending values
  const calculatedComparisonRange = React.useMemo(() => {
    if (!pendingDate.from || !pendingDate.to) return null
    
    const daysDiff = differenceInDays(pendingDate.to, pendingDate.from)
    
    switch (pendingCompareMode) {
      case 'previous_period':
        return {
          from: subDays(pendingDate.from, daysDiff + 1),
          to: subDays(pendingDate.from, 1),
        }
      case 'previous_year':
        return {
          from: subYears(pendingDate.from, 1),
          to: subYears(pendingDate.to, 1),
        }
      case 'custom':
      default:
        return {
          from: subYears(pendingDate.from, 1),
          to: subYears(pendingDate.to, 1),
        }
    }
  }, [pendingDate, pendingCompareMode])

  // Organized preset categories
  const presetCategories: PresetCategory[] = React.useMemo(() => [
    {
      label: t.datePicker.quickSelect,
      presets: [
        {
          label: t.datePicker.today,
          getValue: () => ({ from: new Date(), to: new Date() }),
        },
        {
          label: t.datePicker.yesterday,
          getValue: () => ({ from: subDays(new Date(), 1), to: subDays(new Date(), 1) }),
        },
      ],
    },
    {
      label: t.datePicker.weeks,
      presets: [
        {
          label: t.datePicker.thisWeek,
          getValue: () => ({ 
            from: startOfWeek(new Date(), { weekStartsOn: 1 }), 
            to: endOfWeek(new Date(), { weekStartsOn: 1 }) 
          }),
        },
        {
          label: t.datePicker.lastWeek,
          getValue: () => {
            const lastWeek = subWeeks(new Date(), 1)
            return { 
              from: startOfWeek(lastWeek, { weekStartsOn: 1 }), 
              to: endOfWeek(lastWeek, { weekStartsOn: 1 }) 
            }
          },
        },
        {
          label: t.datePicker.last2Weeks,
          getValue: () => ({ 
            from: startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), 
            to: endOfWeek(new Date(), { weekStartsOn: 1 }) 
          }),
        },
      ],
    },
    {
      label: t.datePicker.months,
      presets: [
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
          label: t.datePicker.last3Months,
          getValue: () => ({ 
            from: startOfMonth(subMonths(new Date(), 2)), 
            to: endOfMonth(new Date()) 
          }),
        },
      ],
    },
    {
      label: t.datePicker.quarters,
      presets: [
        {
          label: t.datePicker.thisQuarter,
          getValue: () => ({ 
            from: startOfQuarter(new Date()), 
            to: endOfQuarter(new Date()) 
          }),
        },
        {
          label: t.datePicker.lastQuarter,
          getValue: () => {
            const lastQuarter = subQuarters(new Date(), 1)
            return { 
              from: startOfQuarter(lastQuarter), 
              to: endOfQuarter(lastQuarter) 
            }
          },
        },
      ],
    },
    {
      label: t.datePicker.years,
      presets: [
        {
          label: t.datePicker.thisYear,
          getValue: () => ({ from: startOfYear(new Date()), to: new Date() }),
        },
        {
          label: t.datePicker.lastYear,
          getValue: () => {
            const lastYear = subYears(new Date(), 1)
            return { 
              from: startOfYear(lastYear), 
              to: endOfYear(lastYear) 
            }
          },
        },
      ],
    },
  ], [t])

  const handlePresetSelect = (getValue: () => DateRange) => {
    const newRange = getValue()
    setPendingDate(newRange)
    setIsSelectingEnd(false)
  }

  const handleDayClick = (day: Date) => {
    // If we have a complete range (both from and to), reset and start new selection
    if (pendingDate?.from && pendingDate?.to && !isSelectingEnd) {
      setPendingDate({ from: day, to: undefined })
      setIsSelectingEnd(true)
      return
    }
    
    // If we're selecting the end date
    if (isSelectingEnd && pendingDate?.from) {
      // If clicked date is before start, swap them
      if (day < pendingDate.from) {
        setPendingDate({ from: day, to: pendingDate.from })
      } else {
        setPendingDate({ from: pendingDate.from, to: day })
      }
      setIsSelectingEnd(false)
      return
    }
    
    // First click - select start date
    setPendingDate({ from: day, to: undefined })
    setIsSelectingEnd(true)
  }

  // Handle week number click to select entire week
  const handleWeekNumberClick = (weekNumber: number, dates: Date[]) => {
    if (dates.length > 0) {
      const weekStart = startOfWeek(dates[0], { weekStartsOn: 1 })
      const weekEnd = endOfWeek(dates[0], { weekStartsOn: 1 })
      setPendingDate({ from: weekStart, to: weekEnd })
      setIsSelectingEnd(false)
    }
  }
  
  const handleApply = () => {
    // Apply all pending changes
    if (pendingDate.from) {
      setDate(pendingDate)
    }
    setComparisonEnabled(pendingCompareEnabled)
    setComparisonMode(pendingCompareMode)
    setAlignByDayOfWeek(pendingAlignByDayOfWeek)
    setOpen(false)
  }
  
  const handleCancel = () => {
    // Reset pending state to current values
    setPendingDate(date)
    setPendingCompareEnabled(filters.comparisonEnabled)
    setPendingCompareMode(filters.comparisonMode)
    setPendingAlignByDayOfWeek(filters.alignByDayOfWeek)
    setOpen(false)
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
            <div className="flex flex-col items-start">
              {date?.from ? (
                <span>
                  {date.to ? (
                    <>
                      {format(date.from, "MMM d, yyyy")} - {format(date.to, "MMM d, yyyy")}
                    </>
                  ) : (
                    format(date.from, "MMM d, yyyy")
                  )}
                </span>
              ) : (
                <span>{t.datePicker.pickDate}</span>
              )}
              {filters.comparisonEnabled && filters.comparisonRange && (
                <span className="text-xs text-muted-foreground">
                  vs {format(filters.comparisonRange.start, "MMM d, yyyy")} - {format(filters.comparisonRange.end, "MMM d, yyyy")}
                </span>
              )}
            </div>
            <ChevronDown className="h-4 w-4 ml-auto opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0 pointer-events-auto" 
          align="end"
          sideOffset={8}
        >
          <div className="flex">
            {/* Sidebar with Categorized Presets */}
            <div className="flex flex-col border-r border-border p-3 min-w-[150px] max-h-[500px] overflow-y-auto">
              {presetCategories.map((category, categoryIndex) => (
                <div key={category.label} className={cn(categoryIndex > 0 && "mt-3 pt-3 border-t border-border")}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                    {category.label}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {category.presets.map((preset) => (
                      <Button
                        key={preset.label}
                        variant="ghost"
                        size="sm"
                        className="justify-start text-sm font-normal h-7 px-2"
                        onClick={() => handlePresetSelect(preset.getValue)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Calendar Area */}
            <div className="flex flex-col">
              <div className="p-3 pb-0">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={pendingDate?.from}
                  selected={pendingDate}
                  onDayClick={handleDayClick}
                  numberOfMonths={2}
                  showWeekNumber
                  onWeekNumberClick={handleWeekNumberClick}
                  weekStartsOn={1}
                />
              </div>
              
              {/* Comparison Section */}
              <div className="border-t border-border p-4 space-y-4">
                {/* Compare Toggle */}
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="compare" 
                    checked={pendingCompareEnabled}
                    onCheckedChange={(checked) => setPendingCompareEnabled(checked === true)}
                  />
                  <Label htmlFor="compare" className="text-sm font-medium cursor-pointer">
                    {t.datePicker.compare}
                  </Label>
                </div>
                
                {/* Comparison Mode Selector */}
                {pendingCompareEnabled && (
                  <div className="space-y-3">
                    <RadioGroup 
                      value={pendingCompareMode} 
                      onValueChange={(value) => setPendingCompareMode(value as ComparisonMode)}
                      className="flex flex-wrap gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="previous_period" id="previous_period" />
                        <Label htmlFor="previous_period" className="text-sm cursor-pointer">
                          {t.datePicker.previousPeriod}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="previous_year" id="previous_year" />
                        <Label htmlFor="previous_year" className="text-sm cursor-pointer">
                          {t.datePicker.samePeriodLastYear}
                        </Label>
                      </div>
                    </RadioGroup>
                    
                    {/* Weekday alignment toggle */}
                    <div className="flex items-center space-x-2 pt-2 border-t border-border">
                      <Checkbox 
                        id="weekday-align" 
                        checked={pendingAlignByDayOfWeek}
                        onCheckedChange={(checked) => setPendingAlignByDayOfWeek(checked === true)}
                      />
                      <Label htmlFor="weekday-align" className="text-sm cursor-pointer">
                        {t.datePicker.matchDayOfWeek}
                      </Label>
                    </div>
                    
                    {/* Show calculated comparison range */}
                    {calculatedComparisonRange && (
                      <p className="text-sm text-muted-foreground">
                        {t.datePicker.comparisonRange}: {format(calculatedComparisonRange.from, "MMM d, yyyy")} - {format(calculatedComparisonRange.to, "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              {/* Apply / Cancel Buttons */}
              <div className="border-t border-border p-3 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  {t.datePicker.cancel}
                </Button>
                <Button size="sm" onClick={handleApply}>
                  {t.datePicker.apply}
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
