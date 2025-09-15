'use client';

import React from 'react';

interface BarChartData {
  label: string;
  value: number;
  color: string;
}

interface BarChartProps {
  data: BarChartData[];
  maxValue?: number;
  height?: number;
}

export function BarChart({ data, maxValue, height = 200 }: BarChartProps) {
  const max = maxValue || Math.max(...data.map(item => item.value));
  const maxBarHeight = height - 80; // Leave more space for labels and padding

  return (
    <div className="w-full h-full overflow-hidden">
      <div className="relative flex flex-col h-full">
        {/* Y-axis labels */}
        <div className="top-0 left-0 z-10 absolute flex flex-col justify-between h-full text-gray-500 text-xs">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <div key={ratio} className="pr-2 text-right">
              {Math.round(max * ratio).toLocaleString()}
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div className="flex justify-between items-end ml-12 px-4 pb-8 h-full">
          {data.map((item, index) => {
            const barHeight = (item.value / max) * maxBarHeight;
            return (
              <div key={index} className="flex flex-col flex-1 justify-end items-center h-full">
                {/* Bar */}
                <div
                  className="mb-2 rounded-t w-8"
                  style={{
                    height: `${barHeight}px`,
                    backgroundColor: item.color,
                    minHeight: item.value > 0 ? '4px' : '0px'
                  }}
                />
                {/* Label */}
                <div className="max-w-16 overflow-hidden text-gray-600 text-xs text-center whitespace-nowrap -rotate-45 origin-top-left transform">
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
