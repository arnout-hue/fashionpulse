import React, { useMemo } from 'react';
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
import { formatCurrency, formatDate } from '@/utils/analytics';
import type { ChartDataPoint, YoYComparison } from '@/types';

// ============================================
// CUSTOM TOOLTIP
// ============================================

interface SmartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function SmartTooltip({ active, payload, label }: SmartTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card border border-border rounded-xl shadow-xl p-4 min-w-[200px]"
    >
      <p className="font-medium text-foreground mb-2">{data?.displayDate || label}</p>
      <div className="space-y-2">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between gap-4">
            <span className="text-sm text-muted-foreground">{entry.name}</span>
            <span 
              className="text-sm font-semibold tabular-nums"
              style={{ color: entry.color }}
            >
              {entry.name.includes('Revenue') 
                ? formatCurrency(entry.value)
                : entry.value?.toLocaleString()}
            </span>
          </div>
        ))}
        {data?.variance !== undefined && (
          <div className={cn(
            'flex justify-between gap-4 pt-2 border-t border-border',
            data.variance >= 0 ? 'text-profit' : 'text-spend'
          )}>
            <span className="text-sm">JoJ Verschil</span>
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

interface SmartTrendChartProps {
  data: ChartDataPoint[];
  showYoY?: boolean;
  height?: number;
  className?: string;
}

export function SmartTrendChart({ 
  data, 
  showYoY = false, 
  height = 300,
  className 
}: SmartTrendChartProps) {
  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--revenue))" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(var(--revenue))" stopOpacity={0} />
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
            tickFormatter={(value) => formatCurrency(value, true)}
            dx={-10}
          />
          <Tooltip content={<SmartTooltip />} />
          
          {/* Area under the line */}
          <Area
            type="monotone"
            dataKey="revenue"
            fill="url(#revenueGradient)"
            stroke="none"
          />
          
          {/* Main revenue line */}
          <Line
            type="monotone"
            dataKey="revenue"
            name="Omzet"
            stroke="hsl(var(--revenue))"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 6, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
          />
          
          {/* YoY comparison line */}
          {showYoY && (
            <Line
              type="monotone"
              dataKey="revenueYoY"
              name="Omzet (JoJ)"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
            />
          )}
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
            name="Verschil"
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
