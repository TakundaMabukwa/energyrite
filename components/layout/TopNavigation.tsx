'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { BarChart3, FileText, Activity, TrendingUp } from 'lucide-react';

const topNavItems = [
  { id: 'dashboard', label: 'Dashboard', mobileLabel: 'Dash', icon: BarChart3 },
  { id: 'reports', label: 'Reports', mobileLabel: 'Reports', icon: FileText },
  { id: 'activity', label: 'Activity Report', mobileLabel: 'Activity', icon: Activity },
  { id: 'executive', label: 'Executive Dashboard', mobileLabel: 'Executive', icon: TrendingUp }
];

export function TopNavigation() {
  const { activeTab, setActiveTab } = useApp();

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-2 sm:px-6 py-2 sm:py-4">
        <div className="flex items-center">
          <div className="grid grid-cols-4 gap-2 sm:flex sm:items-center sm:gap-3 sm:overflow-x-auto sm:pb-1 w-full sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden">
          {topNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex items-center justify-center sm:justify-start gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg font-medium text-sm sm:text-base transition-all duration-200",
                activeTab === item.id
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
              )}
            >
              <item.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="sm:hidden">{item.mobileLabel}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          ))}
          </div>
        </div>
      </div>
    </div>
  );
}
