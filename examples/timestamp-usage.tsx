// Example: How to use the timestamp formatter in your existing components

import { formatForDisplay, formatAsRelative } from '@/lib/utils/date-formatter';
import { TimestampDisplay } from '@/components/ui/timestamp-display';

// Example 1: Direct usage in a component
function MyComponent() {
  const timestamp = '2025-09-20T11:28:38.827Z';
  
  return (
    <div>
      {/* Simple formatting */}
      <p>Last updated: {formatForDisplay(timestamp)}</p>
      
      {/* Relative time */}
      <p>Updated: {formatAsRelative(timestamp)}</p>
      
      {/* Using the component */}
      <TimestampDisplay timestamp={timestamp} format="display" />
    </div>
  );
}

// Example 2: In a list of timestamps
function TimestampList({ timestamps }: { timestamps: string[] }) {
  return (
    <div className="space-y-2">
      {timestamps.map((timestamp, index) => (
        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
          <TimestampDisplay timestamp={timestamp} format="relative" />
        </div>
      ))}
    </div>
  );
}

// Example 3: In a table or data display
function DataTable({ data }: { data: Array<{ id: string; timestamp: string; value: string }> }) {
  return (
    <table className="w-full">
      <thead>
        <tr>
          <th>ID</th>
          <th>Value</th>
          <th>Last Updated</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.id}>
            <td>{row.id}</td>
            <td>{row.value}</td>
            <td>
              <TimestampDisplay timestamp={row.timestamp} format="display" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Example 4: Using the hook
import { useTimestampFormatter } from '@/hooks/use-timestamp-formatter';

function HookExample({ timestamp }: { timestamp: string }) {
  const formattedTime = useTimestampFormatter(timestamp, 'relative');
  
  return <span>{formattedTime}</span>;
}
