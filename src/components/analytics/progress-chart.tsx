'use client';

import { cn } from '@/lib/utils';

interface DataPoint {
  label: string;
  value: number;
}

interface ProgressChartProps {
  data: DataPoint[];
  title?: string;
  height?: number;
  color?: 'violet' | 'blue' | 'green' | 'amber' | 'red';
}

export function ProgressChart({
  data,
  title,
  height = 200,
  color = 'violet',
}: ProgressChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  const colorClasses = {
    violet: 'from-violet-600 to-indigo-600',
    blue: 'from-blue-600 to-cyan-600',
    green: 'from-green-600 to-emerald-600',
    amber: 'from-amber-600 to-orange-600',
    red: 'from-red-600 to-rose-600',
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      {title && (
        <h3 className="mb-4 text-lg font-semibold text-slate-900">{title}</h3>
      )}
      <div
        className="flex items-end justify-between gap-2"
        style={{ height: `${height}px` }}
      >
        {data.map((point, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <span className="text-xs font-medium text-slate-600">{point.value}</span>
            <div
              className={cn(
                'w-full rounded-t-lg bg-gradient-to-t transition-all duration-500',
                colorClasses[color]
              )}
              style={{
                height: `${(point.value / maxValue) * (height - 40)}px`,
                minHeight: '4px',
              }}
            />
            <span className="text-xs text-slate-500">{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface LineChartProps {
  data: DataPoint[];
  title?: string;
  height?: number;
}

export function LineChart({ data, title, height = 200 }: LineChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const points = data
    .map((point, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - (point.value / maxValue) * 80;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      {title && (
        <h3 className="mb-4 text-lg font-semibold text-slate-900">{title}</h3>
      )}
      <div style={{ height: `${height}px` }}>
        <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgb(124 58 237)" />
              <stop offset="100%" stopColor="rgb(79 70 229)" />
            </linearGradient>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(124 58 237)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="rgb(124 58 237)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon
            points={`0,100 ${points} 100,100`}
            fill="url(#areaGradient)"
          />
          <polyline
            points={points}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="mt-2 flex justify-between">
        {data.map((point, i) => (
          <span key={i} className="text-xs text-slate-500">
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}

interface DonutChartProps {
  value: number;
  max: number;
  label?: string;
  size?: number;
  strokeWidth?: number;
}

export function DonutChart({
  value,
  max,
  label,
  size = 120,
  strokeWidth = 10,
}: DonutChartProps) {
  const percentage = Math.min(Math.round((value / max) * 100), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-100"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="text-violet-600 transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-slate-900">{percentage}%</span>
          <span className="text-xs text-slate-500">{value}/{max}</span>
        </div>
      </div>
      {label && (
        <p className="mt-2 text-sm font-medium text-slate-700">{label}</p>
      )}
    </div>
  );
}
