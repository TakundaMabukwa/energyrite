'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { DashboardView } from '@/components/views/DashboardView';
import { CostCentersView } from '@/components/views/CostCentersView';
import { StoreEquipmentView } from '@/components/views/StoreEquipmentView';
import { UrlIndicator } from '@/components/ui/url-indicator';
import { useApp } from '@/contexts/AppContext';

export function MainLayout() {
  const { activeTab } = useApp();

  const renderMainContent = () => {
    switch (activeTab) {
      case 'cost-centres':
        return <CostCentersView />;
      case 'store-equipment':
        return <StoreEquipmentView />;
      case 'dashboard':
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex bg-gray-100 h-screen">
      {/* Sidebar */}
      <aside className="relative flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-auto">
          {renderMainContent()}
        </main>
      </div>
      
      {/* URL Indicator for testing */}
      <UrlIndicator />
    </div>
  );
}