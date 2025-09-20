'use client';

import { useMemo } from 'react';
import { formatForDisplay, formatAsRelative, formatForLogs, formatDateOnly } from '@/lib/utils/date-formatter';

/**
 * Hook for formatting timestamps with automatic updates for relative time
 */
export function useTimestampFormatter(timestamp: string, format: 'display' | 'relative' | 'logs' | 'date-only' = 'display') {
  return useMemo(() => {
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
  }, [timestamp, format]);
}

/**
 * Hook for formatting multiple timestamps
 */
export function useMultipleTimestampFormatter(timestamps: string[], format: 'display' | 'relative' | 'logs' | 'date-only' = 'display') {
  return useMemo(() => {
    return timestamps.map(timestamp => {
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
    });
  }, [timestamps, format]);
}
