'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

export function UrlIndicator() {
  const searchParams = useSearchParams();
  
  const tab = searchParams.get('tab');
  const route = searchParams.get('route');
  const view = searchParams.get('view');
  
  if (!tab && !route && !view) {
    return null;
  }
  
  return (
    <div className="right-4 bottom-4 z-50 fixed bg-white shadow-lg p-3 border border-gray-200 rounded-lg">
      <div className="mb-2 text-gray-600 text-xs">Current URL Parameters:</div>
      <div className="flex flex-wrap gap-1">
        {tab && (
          <Badge variant="secondary" className="text-xs">
            tab: {tab}
          </Badge>
        )}
        {route && (
          <Badge variant="outline" className="text-xs">
            route: {route}
          </Badge>
        )}
        {view && (
          <Badge variant="default" className="text-xs">
            view: {view}
          </Badge>
        )}
      </div>
    </div>
  );
}
