'use client';

import React from 'react';

interface SemiCircleChartData {
  label: string;
  value: number;
  color: string;
}

interface SemiCircleChartProps {
  data: SemiCircleChartData[];
  size?: number;
}

export function SemiCircleChart({ data, size = 200 }: SemiCircleChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulativePercentage = 0;

  const createSemiCirclePath = (percentage: number, index: number) => {
    const startAngle = (cumulativePercentage * 180) - 90; // Start from -90 degrees
    const endAngle = ((cumulativePercentage + percentage) * 180) - 90;
    cumulativePercentage += percentage;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = (size - 40) / 2;

    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);

    const largeArcFlag = percentage > 0.5 ? 1 : 0;

    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  return (
    <div className="flex justify-center items-center">
      <div className="relative">
        <svg width={size} height={size / 2 + 20} className="-rotate-90 transform">
          {data.map((item, index) => {
            const percentage = item.value / total;
            return (
              <path
                key={index}
                d={createSemiCirclePath(percentage, index)}
                fill={item.color}
                stroke="white"
                strokeWidth="1"
              />
            );
          })}
        </svg>
        
        {/* Labels */}
        <div className="absolute inset-0 flex flex-col justify-center items-start pl-4">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div 
                className="rounded-full w-3 h-3" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-gray-700 text-xs">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
