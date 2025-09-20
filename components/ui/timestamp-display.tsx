'use client';

import React from 'react';
import { formatForDisplay, formatAsRelative, formatForLogs, formatDateOnly } from '@/lib/utils/date-formatter';
import { Clock } from 'lucide-react';

interface TimestampDisplayProps {
  timestamp: string;
  format?: 'display' | 'relative' | 'logs' | 'date-only';
  showIcon?: boolean;
  className?: string;
}

export function TimestampDisplay({ 
  timestamp, 
  format = 'display', 
  showIcon = true,
  className = '' 
}: TimestampDisplayProps) {
  const getFormattedTime = () => {
    switch (format) {
      case 'relative':
        return formatAsRelative(timestamp);
      case 'logs':
        return formatForLogs(timestamp);
      case 'date-only':
        return formatDateOnly(timestamp);
      case 'display':
      default:
        return formatForDisplay(timestamp);
    }
  };

  return (
    <div className={`flex items-center gap-2 text-sm text-gray-600 ${className}`}>
      {showIcon && <Clock className="w-4 h-4" />}
      <span>{getFormattedTime()}</span>
    </div>
  );
}

// Example usage component
export function TimestampExamples() {
  const timestamps = [
    '2025-09-20T11:28:38.827Z',
    '2025-09-20T11:28:38.813Z',
    new Date().toISOString(), // Current time
    new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
  ];

  return (
    <div className="space-y-4 p-4">
      <h3 className="text-lg font-semibold">Timestamp Formatting Examples</h3>
      
      <div className="space-y-3">
        <h4 className="font-medium text-gray-700">Display Format (Default)</h4>
        {timestamps.map((timestamp, index) => (
          <div key={index} className="flex items-center gap-4">
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
              {timestamp}
            </code>
            <TimestampDisplay timestamp={timestamp} format="display" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h4 className="font-medium text-gray-700">Relative Format</h4>
        {timestamps.map((timestamp, index) => (
          <div key={index} className="flex items-center gap-4">
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
              {timestamp}
            </code>
            <TimestampDisplay timestamp={timestamp} format="relative" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h4 className="font-medium text-gray-700">Date Only</h4>
        {timestamps.map((timestamp, index) => (
          <div key={index} className="flex items-center gap-4">
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
              {timestamp}
            </code>
            <TimestampDisplay timestamp={timestamp} format="date-only" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h4 className="font-medium text-gray-700">Logs Format (Full Precision)</h4>
        {timestamps.slice(0, 2).map((timestamp, index) => (
          <div key={index} className="flex items-center gap-4">
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
              {timestamp}
            </code>
            <TimestampDisplay timestamp={timestamp} format="logs" />
          </div>
        ))}
      </div>
    </div>
  );
}
