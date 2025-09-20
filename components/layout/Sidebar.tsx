'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { 
  BarChart3, 
  Store, 
  Building2, 
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';
import Image from 'next/image';

const sidebarItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: BarChart3,
    active: true
  },
  {
    id: 'store-equipment',
    label: 'Equipment',
    icon: Store,
    active: false
  },
  {
    id: 'cost-centres',
    label: 'Fuel Gauges',
    icon: Building2,
    active: false
  }
];

export function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, activeTab, setActiveTab } = useApp();

  return (
    <div className={cn(
      "flex flex-col bg-white border-gray-200 border-r h-full transition-all duration-300 ease-in-out",
      sidebarCollapsed ? "w-16" : "w-64"
    )}>
      {/* Logo Section */}
      <div className="p-4 border-gray-200 border-b">
        <div className="flex justify-center items-center">
          {!sidebarCollapsed ? (
            <Image
              src="https://upload.wikimedia.org/wikipedia/commons/9/91/KFC_Logo.svg"
              alt="KFC Logo"
              width={60}
              height={40}
              className="w-auto h-10"
            />
          ) : (
            <div className="flex justify-center items-center bg-gradient-to-br from-red-500 to-red-600 rounded-lg w-8 h-8">
              <span className="font-bold text-white text-sm">K</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-2 p-4">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex items-center gap-3 px-3 py-3 rounded-lg w-full text-left transition-all duration-200",
              activeTab === item.id
                ? "bg-green-50 text-green-700 border-l-4 border-green-500"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
            )}
          >
            <item.icon className="flex-shrink-0 w-5 h-5" />
            {!sidebarCollapsed && (
              <span className="font-medium">{item.label}</span>
            )}
          </button>
        ))}
      </nav>


      {/* Bottom Section */}
      <div className="p-4 border-gray-200 border-t">
        <div className="flex items-center gap-3 px-3 py-3 w-full text-gray-600">
          <div className="flex-shrink-0 bg-gray-200 rounded-full w-5 h-5"></div>
          {!sidebarCollapsed && (
            <span className="font-medium text-gray-500">Settings</span>
          )}
        </div>
      </div>

      {/* Collapse Toggle */}
      <Button
        variant="ghost"
        size="sm"
        className="top-20 -right-3 absolute bg-white shadow-sm hover:shadow-md border border-gray-200 rounded-full w-6 h-6"
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </Button>
    </div>
  );
}