'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { BarChart3, FileText, Activity, TrendingUp } from 'lucide-react';

const topNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'activity', label: 'Activity Report', icon: Activity },
  { id: 'executive', label: 'Executive Dashboard', icon: TrendingUp }
];

export function TopNavigation() {
  const { activeTab, setActiveTab } = useApp();

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center space-x-8">
          {topNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200",
                activeTab === item.id
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
              )}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}