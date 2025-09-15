'use client';

import React from 'react';

interface PieChartData {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
  size?: number;
}

export function PieChart({ data, size = 200 }: PieChartProps) {
  // Filter out invalid data and ensure values are numbers
  const validData = data.filter(item => 
    typeof item.value === 'number' && 
    !isNaN(item.value) && 
    item.value >= 0
  );
  
  const total = validData.reduce((sum, item) => sum + item.value, 0);
  let cumulativePercentage = 0;
  
  // If no valid data or total is 0, show a simple "No Data" circle
  if (validData.length === 0 || total === 0) {
    return (
      <div className="flex justify-center items-center w-full h-full overflow-hidden">
        <div className="relative">
          <svg width={size} height={size} className="-rotate-90 transform">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={(size - 40) / 2}
              fill="#6B7280"
              stroke="white"
              strokeWidth="1"
            />
          </svg>
          <div className="absolute inset-0 flex justify-center items-center">
            <div className="font-medium text-gray-500 text-sm">No Data Available</div>
          </div>
        </div>
      </div>
    );
  }

  const createPath = (percentage: number, index: number) => {
    const startAngle = (cumulativePercentage * 360) - 90;
    const endAngle = ((cumulativePercentage + percentage) * 360) - 90;
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
    <div className="flex justify-center items-center w-full h-full overflow-hidden">
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90 transform">
          {validData.map((item, index) => {
            const percentage = item.value / total;
            return (
              <path
                key={index}
                d={createPath(percentage, index)}
                fill={item.color}
                stroke="white"
                strokeWidth="1"
              />
            );
          })}
        </svg>
        
        {/* Labels with connecting lines */}
        <svg width={size} height={size} className="top-0 left-0 absolute">
          {validData.map((item, index) => {
            let labelCumulativePercentage = 0;
            for (let i = 0; i < index; i++) {
              labelCumulativePercentage += validData[i].value / total;
            }
            
            const percentage = item.value / total;
            const angle = (labelCumulativePercentage + percentage / 2) * 360 - 90;
            const angleRad = (angle * Math.PI) / 180;
            
            const centerX = size / 2;
            const centerY = size / 2;
            const radius = (size - 40) / 2;
            
            // Calculate line start point (on pie slice edge)
            const lineStartX = centerX + radius * Math.cos(angleRad);
            const lineStartY = centerY + radius * Math.sin(angleRad);
            
            // Calculate line end point (outside the pie)
            const lineEndX = centerX + (radius + 40) * Math.cos(angleRad);
            const lineEndY = centerY + (radius + 40) * Math.sin(angleRad);
            
            return (
              <line
                key={index}
                x1={lineStartX}
                y1={lineStartY}
                x2={lineEndX}
                y2={lineEndY}
                stroke={item.color}
                strokeWidth="1"
              />
            );
          })}
        </svg>
        
        {/* Labels positioned around the pie */}
        <div className="absolute inset-0">
          {validData.map((item, index) => {
            let labelCumulativePercentage = 0;
            for (let i = 0; i < index; i++) {
              labelCumulativePercentage += validData[i].value / total;
            }
            
            const percentage = item.value / total;
            const angle = (labelCumulativePercentage + percentage / 2) * 360 - 90;
            const angleRad = (angle * Math.PI) / 180;
            
            const centerX = size / 2;
            const centerY = size / 2;
            const radius = (size - 40) / 2;
            
            // Position label at the end of the line
            const labelX = centerX + (radius + 50) * Math.cos(angleRad);
            const labelY = centerY + (radius + 50) * Math.sin(angleRad);
            
            return (
              <div
                key={index}
                className="absolute text-gray-700 text-xs"
                style={{
                  left: `${labelX}px`,
                  top: `${labelY}px`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                {item.label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
