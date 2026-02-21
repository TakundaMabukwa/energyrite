'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { 
  BarChart3, 
  Store, 
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';
import { useUser } from '@/contexts/UserContext';
import Image from 'next/image';

interface SidebarProps {
  mobile?: boolean;
  onNavigate?: () => void;
  className?: string;
}

export function Sidebar({ mobile = false, onNavigate, className }: SidebarProps) {
  const { sidebarCollapsed, setSidebarCollapsed, activeTab, setActiveTab } = useApp();
  const { isAdmin, isSecondLevelAdmin } = useUser();
  const isCollapsed = mobile ? false : sidebarCollapsed;

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
      active: true
    },
    // {
    //   id: 'activity-snapshots',
    //   label: 'Activity Snapshots',
    //   icon: Clock,
    //   active: false
    // },
    {
      id: 'add-user',
      label: 'Add User',
      icon: UserPlus,
      active: false,
      adminOnly: true
    }
  ];

  return (
    <div className={cn(
      "flex flex-col bg-white border-gray-200 border-r h-full transition-all duration-300 ease-in-out",
      mobile ? "w-full" : (isCollapsed ? "w-16" : "w-64"),
      className
    )}>
      {/* Logo Section */}
      <div className="p-4 border-gray-200 border-b">
        <div className="flex justify-center items-center">
          {!isCollapsed ? (
            <Image
              src="/energyease_logo_green_orange_1m.png"
              alt="Energyease Logo"
              width={150}
              height={40}
              className="w-auto h-8"
            />
          ) : (
            <div className="flex justify-center items-center bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg w-8 h-8">
              <span className="font-bold text-white text-sm">E</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-2 p-4">
        {sidebarItems.map((item) => {
          // Second level admins do not have access to these tabs
          if (isSecondLevelAdmin && (item.id === 'store-equipment' || item.id === 'add-user')) {
            return null;
          }

          // Skip admin-only items if user is not admin
          if (item.adminOnly && !isAdmin) {
            return null;
          }

          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                onNavigate?.();
              }}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg w-full text-left transition-all duration-200",
                activeTab === item.id
                  ? "bg-green-50 text-green-700 border-l-4 border-green-500"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
              )}
              >
                <item.icon className="flex-shrink-0 w-5 h-5" />
                {!isCollapsed && (
                  <span className="font-medium">{item.label}</span>
                )}
              </button>
          );
        })}
      </nav>


      {/* Bottom Section */}
      <div className="p-4 border-gray-200 border-t">
        <div className="flex items-center gap-3 px-3 py-3 w-full text-gray-600">
          <div className="flex-shrink-0 bg-gray-200 rounded-full w-5 h-5"></div>
          {!isCollapsed && (
            <span className="font-medium text-gray-500">Settings</span>
          )}
        </div>
      </div>

      {/* Collapse Toggle */}
      {!mobile && (
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
      )}
    </div>
  );
}
