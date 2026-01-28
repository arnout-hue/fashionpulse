import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { cn } from '@/lib/utils';
import { formatCurrency, formatROAS, formatPercentage } from '@/utils/analytics';
import type { BrandBenchmarkPoint } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

interface BrandPodiumProps {
  data: BrandBenchmarkPoint[];
  height?: number;
}

interface ChartColumnProps {
  title: string;
  dataset: BrandBenchmarkPoint[];
  dataKey: keyof BrandBenchmarkPoint;
  formatter: (val: number) => string;
  color: string;
  isGrowth?: boolean;
}

function ChartColumn({
  title,
  dataset,
  dataKey,
  formatter,
  color,
  isGrowth = false,
}: ChartColumnProps) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="text-center mb-4">
        <h4 className="font-semibold text-foreground">{title}</h4>
      </div>

      <div className="flex-1 min-h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={dataset}
            layout="vertical"
            margin={{ top: 5, right: 60, left: 80, bottom: 5 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
              width={75}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload as BrandBenchmarkPoint;
                  return (
                    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                      <p className="font-semibold text-foreground">{d.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {title}: {formatter(d[dataKey] as number)}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey={dataKey} radius={[0, 4, 4, 0]}>
              {dataset.map((entry, index) => {
                // Determine color
                let fillColor = color;
                if (isGrowth) {
                  fillColor =
                    (entry[dataKey] as number) >= 0
                      ? 'hsl(var(--profit))'
                      : 'hsl(var(--spend))';
                }

                // Fade out positions 4+
                const opacity = index < 3 ? 1 : 0.3;

                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={fillColor}
                    fillOpacity={opacity}
                  />
                );
              })}
              <LabelList
                dataKey={dataKey}
                position="right"
                formatter={(val: number) => formatter(val)}
                style={{
                  fill: 'hsl(var(--foreground))',
                  fontSize: 11,
                  fontWeight: 500,
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function BrandPodium({ data, height = 400 }: BrandPodiumProps) {
  const { t } = useTranslation();

  // Sort data 3 distinct ways for the 3 charts
  const byRevenue = [...data].sort((a, b) => b.revenue - a.revenue);
  const byRoas = [...data].sort((a, b) => b.roas - a.roas);
  const byGrowth = [...data].sort(
    (a, b) => b.growthPercentage - a.growthPercentage
  );

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No brand data available
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-3 gap-6"
      style={{ minHeight: height }}
    >
      <ChartColumn
        title={t.brandBenchmarking?.revenue || 'Revenue'}
        dataset={byRevenue}
        dataKey="revenue"
        formatter={(v) => formatCurrency(v, true)}
        color="hsl(var(--primary))"
      />
      <ChartColumn
        title={t.brandBenchmarking?.roas || 'ROAS'}
        dataset={byRoas}
        dataKey="roas"
        formatter={(v) => formatROAS(v)}
        color="hsl(var(--profit))"
      />
      <ChartColumn
        title={t.brandBenchmarking?.growth || 'Growth'}
        dataset={byGrowth}
        dataKey="growthPercentage"
        formatter={(v) => formatPercentage(v)}
        color="hsl(var(--chart-3))"
        isGrowth={true}
      />
    </div>
  );
}
