'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Thermometer, Droplets, Gauge, Clock } from 'lucide-react';

interface FuelGaugeProps {
  location: string;
  fuelLevel: number;
  temperature: number;
  volume: number;
  remaining: string;
  status: string;
  lastUpdated: string;
  className?: string;
}

export function FuelGauge({
  location,
  fuelLevel,
  temperature,
  volume,
  remaining,
  status,
  lastUpdated,
  className
}: FuelGaugeProps) {
  const radius = 80;
  const strokeWidth = 12;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (fuelLevel / 100) * circumference;

  const getStatusColor = (status: string) => {
    if (status.includes('ENGINE OFF')) return 'bg-gray-100 text-gray-700 border-gray-200';
    if (status.includes('Possible Fuel Fill')) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-green-100 text-green-700 border-green-200';
  };

  const getFuelColor = (level: number) => {
    if (level < 25) return '#ef4444'; // red
    if (level < 50) return '#f97316'; // orange
    if (level < 75) return '#eab308'; // yellow
    return '#22c55e'; // green
  };

  return (
    <div className={cn(
      "bg-white shadow-sm hover:shadow-md p-6 border border-gray-200 rounded-xl transition-all duration-300",
      className
    )}>
      {/* Header */}
      <div className="mb-4 text-center">
        <h3 className="mb-2 font-semibold text-gray-900 text-lg">{location}</h3>
        <Badge 
          variant="outline" 
          className={cn("font-medium text-xs", getStatusColor(status))}
        >
          {status}
        </Badge>
      </div>

      {/* Fuel Gauge */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <svg
            height={radius * 2}
            width={radius * 2}
            className="-rotate-90 transform"
          >
            {/* Background Circle */}
            <circle
              stroke="#f1f5f9"
              fill="transparent"
              strokeWidth={strokeWidth}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            {/* Progress Circle */}
            <circle
              stroke={getFuelColor(fuelLevel)}
              fill="transparent"
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              style={{ strokeDashoffset }}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
              className="transition-all duration-1000 ease-out"
              strokeLinecap="round"
            />
          </svg>
          
          {/* Center Content */}
          <div className="absolute inset-0 flex flex-col justify-center items-center">
            <Gauge className="mb-1 w-6 h-6 text-gray-400" />
            <span className="font-medium text-gray-500 text-xs">Fuel</span>
            <span className="mt-1 font-bold text-gray-900 text-2xl">{fuelLevel}</span>
            <span className="text-gray-500 text-xs">%</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="space-y-3">
        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-blue-500" />
            <span className="font-medium text-gray-700 text-sm">{temperature}°C</span>
          </div>
          <span className="text-gray-500 text-xs">Temperature</span>
        </div>

        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-blue-500" />
            <span className="font-medium text-gray-700 text-sm">{volume}L</span>
          </div>
          <span className="text-gray-500 text-xs">Volume</span>
        </div>

        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex justify-between items-center mb-1">
            <span className="font-medium text-blue-900 text-sm">Remaining</span>
            <span className="font-bold text-blue-900 text-sm">{remaining}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600 text-xs">{lastUpdated}</span>
        </div>
      </div>

      {/* Add Note Button */}
      <button className="bg-gray-100 hover:bg-gray-200 mt-4 px-4 py-2 rounded-lg w-full font-medium text-gray-700 text-sm transition-colors duration-200">
        Add Note
      </button>
    </div>
  );
}