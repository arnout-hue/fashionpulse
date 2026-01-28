import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Area,
  ReferenceLine,
} from 'recharts';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatCurrency, formatROAS } from '@/utils/analytics';
import { getBrandAbbreviation } from '@/utils/dataHarmonizer';
import { useTranslation } from '@/hooks/useTranslation';
import type { ChartDataPoint, ChartKPI, EventAnnotation, EventType } from '@/types';
import { format } from 'date-fns';

// ============================================
// KPI CONFIGURATION
// ============================================

interface KPIConfig {
  dataKey: string;
  yoyDataKey: string;
  formatter: (value: number) => string;
  gradientId: string;
  color: string;
}

function getKPIConfig(kpi: ChartKPI): KPIConfig {
  switch (kpi) {
    case 'aov':
      return {
        dataKey: 'aov',
        yoyDataKey: 'aovYoY',
        formatter: (v) => formatCurrency(v),
        gradientId: 'aovGradient',
        color: 'hsl(var(--revenue))',
      };
    case 'spend':
      return {
        dataKey: 'spend',
        yoyDataKey: 'spendYoY',
        formatter: (v) => formatCurrency(v),
        gradientId: 'spendGradient',
        color: 'hsl(var(--spend))',
      };
    case 'roas':
      return {
        dataKey: 'roas',
        yoyDataKey: 'roasYoY',
        formatter: (v) => formatROAS(v),
        gradientId: 'roasGradient',
        color: 'hsl(var(--profit))',
      };
    default:
      return {
        dataKey: 'revenue',
        yoyDataKey: 'revenueYoY',
        formatter: (v) => formatCurrency(v),
        gradientId: 'revenueGradient',
        color: 'hsl(var(--revenue))',
      };
  }
}

// ============================================
// CUSTOM TOOLTIP
// ============================================

interface SmartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  kpi?: ChartKPI;
}

function SmartTooltip({ active, payload, label, kpi = 'revenue' }: SmartTooltipProps) {
  const { t } = useTranslation();
  const config = getKPIConfig(kpi);
  
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;
  
  // Filter out entries with empty names (Area component)
  const filteredPayload = payload.filter((entry: any) => entry.name && entry.name.trim() !== '');
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card border border-border rounded-xl shadow-xl p-4 min-w-[200px]"
    >
      <p className="font-medium text-foreground mb-2">{data?.displayDate || label}</p>
      <div className="space-y-2">
        {filteredPayload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between gap-4">
            <span className="text-sm text-muted-foreground">{entry.name}</span>
            <span 
              className="text-sm font-semibold tabular-nums"
              style={{ color: entry.color }}
            >
              {config.formatter(entry.value)}
            </span>
          </div>
        ))}
        {kpi === 'revenue' && data?.variance !== undefined && (
          <div className={cn(
            'flex justify-between gap-4 pt-2 border-t border-border',
            data.variance >= 0 ? 'text-profit' : 'text-spend'
          )}>
            <span className="text-sm">{t.charts.yoyVariance}</span>
            <span className="text-sm font-semibold tabular-nums">
              {data.variance >= 0 ? '+' : ''}{formatCurrency(data.variance)}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// SMART TREND CHART
// ============================================

// Helper function for event colors
const getEventColor = (type: EventType): string => {
  switch(type) {
    case 'marketing': return '#10b981'; // green
    case 'technical': return '#ef4444'; // red  
    case 'holiday': return '#f59e0b';   // amber
    default: return '#6366f1';          // indigo
  }
};

// ============================================
// CUSTOM EVENT LABEL
// ============================================

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

interface SmartTrendChartProps {
  data: ChartDataPoint[];
  events?: EventAnnotation[];
  showYoY?: boolean;
  height?: number;
  className?: string;
  currentYear?: number;
  comparisonYear?: number;
  selectedKPI?: ChartKPI;
}

export function SmartTrendChart({ 
  data, 
  events = [],
  showYoY = false, 
  height = 300,
  className,
  currentYear,
  comparisonYear,
  selectedKPI = 'revenue',
}: SmartTrendChartProps) {
  const { t } = useTranslation();
  const config = getKPIConfig(selectedKPI);
  
  // Event hover state
  const [hoveredEvent, setHoveredEvent] = useState<{
    event: EventAnnotation;
    x: number;
    y: number;
  } | null>(null);
  
  // Get translated KPI label
  const kpiLabel = useMemo(() => {
    switch (selectedKPI) {
      case 'aov': return t.charts.aov;
      case 'spend': return t.charts.spend;
      case 'roas': return t.charts.roas;
      default: return t.charts.revenue;
    }
  }, [selectedKPI, t]);
  
  // Build dynamic line names with years
  const currentLineName = currentYear ? `${kpiLabel} ${currentYear}` : kpiLabel;
  const comparisonLineName = comparisonYear ? `${kpiLabel} ${comparisonYear}` : `${kpiLabel} (prev)`;
  
  return (
    <div className={cn('w-full relative', className)}>
      {/* Event hover tooltip */}
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
      
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={config.gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={config.color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={config.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(var(--border))" 
            vertical={false}
          />
          <XAxis 
            dataKey="displayDate" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            dy={10}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            tickFormatter={config.formatter}
            dx={-10}
          />
          <Tooltip content={<SmartTooltip kpi={selectedKPI} />} />
          
          {/* Area under the line - hidden from tooltip with empty name */}
          <Area
            type="monotone"
            dataKey={config.dataKey}
            name=""
            fill={`url(#${config.gradientId})`}
            stroke="none"
            legendType="none"
          />
          
          {/* Main line */}
          <Line
            type="monotone"
            dataKey={config.dataKey}
            name={currentLineName}
            stroke={config.color}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 6, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
          />
          
          {/* YoY comparison line */}
          {showYoY && (
            <Line
              type="monotone"
              dataKey={config.yoyDataKey}
              name={comparisonLineName}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
            />
          )}
          
          {/* Event markers */}
          {events.map((event, index) => {
            const eventDateStr = format(event.date, 'MMM d');
            // Only render if date exists in chart data
            const matchingData = data.find(d => d.displayDate === eventDateStr);
            if (!matchingData) return null;
            
            const eventColor = getEventColor(event.type);
            
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
                    onMouseEnter={(e, x, y) => setHoveredEvent({ event: e, x, y })}
                    onMouseLeave={() => setHoveredEvent(null)}
                  />
                )}
              />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================
// VARIANCE BAR CHART
// ============================================

interface VarianceChartProps {
  data: { date: string; variance: number; displayDate: string }[];
  height?: number;
  className?: string;
}

export function VarianceChart({ data, height = 100, className }: VarianceChartProps) {
  const { t } = useTranslation();
  
  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis 
            dataKey="displayDate" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            tickFormatter={(value) => formatCurrency(value, true)}
          />
          <ReferenceLine y={0} stroke="hsl(var(--border))" />
          <Tooltip content={<SmartTooltip />} />
          <Bar 
            dataKey="variance"
            name={t.charts.variance}
            radius={[2, 2, 0, 0]}
          >
            {data.map((entry, index) => (
              <motion.rect
                key={index}
                fill={entry.variance >= 0 ? 'hsl(var(--profit))' : 'hsl(var(--spend))'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================
// CHANNEL SPLIT CHART
// ============================================

interface ChannelSplitChartProps {
  data: { name: string; web: number; app: number }[];
  height?: number;
  className?: string;
}

export function ChannelSplitChart({ data, height = 300, className }: ChannelSplitChartProps) {
  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart 
          data={data} 
          layout="vertical"
          margin={{ top: 10, right: 30, left: 60, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis 
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            tickFormatter={(value) => formatCurrency(value, true)}
          />
          <YAxis 
            type="category"
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          />
          <Tooltip content={<SmartTooltip />} />
          <Bar 
            dataKey="web" 
            name="Web" 
            stackId="channel" 
            fill="hsl(var(--web-channel))"
            radius={[0, 0, 0, 0]}
          />
          <Bar 
            dataKey="app" 
            name="App" 
            stackId="channel" 
            fill="hsl(var(--app-channel))"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================
// PLATFORM COMPARISON CHART
// ============================================

interface PlatformComparisonChartProps {
  facebookData: { roas: number; cpa: number; spend: number };
  googleData: { roas: number; cpa: number; spend: number };
  className?: string;
}

export function PlatformComparisonChart({ 
  facebookData, 
  googleData,
  className 
}: PlatformComparisonChartProps) {
  const data = [
    { metric: 'ROAS', Facebook: facebookData.roas, Google: googleData.roas },
    { metric: 'CPA', Facebook: facebookData.cpa, Google: googleData.cpa },
  ];

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="metric"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          />
          <Tooltip content={<SmartTooltip />} />
          <Bar 
            dataKey="Facebook" 
            fill="hsl(var(--facebook))"
            radius={[4, 4, 0, 0]}
          />
          <Bar 
            dataKey="Google" 
            fill="hsl(var(--google))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
