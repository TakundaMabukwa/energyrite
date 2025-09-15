'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

interface TabItem {
  value: string;
  label: string;
  icon: React.ReactNode;
}

interface HeaderTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabClick: (tabValue: string) => void;
}

export function HeaderTabs({ tabs, activeTab, onTabClick }: HeaderTabsProps) {
  return (
    <div className="flex items-center gap-10">
      {tabs.map((tab) => (
        <Button
          key={tab.value}
          variant="ghost"
          size="sm"
          onClick={() => onTabClick(tab.value)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-md transition-colors duration-200
            ${activeTab === tab.value
              ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
            }
          `}
        >
          {tab.icon}
          {tab.label}
        </Button>
      ))}
    </div>
  );
}
