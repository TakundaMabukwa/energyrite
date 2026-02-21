'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { TopNavigation } from './TopNavigation';
import { DashboardView } from '@/components/views/DashboardView';
import { FuelGaugesView } from '@/components/views/FuelGaugesView';
import { StoreEquipmentView } from '@/components/views/StoreEquipmentView';
import { UsersView } from '@/components/views/UsersView';
import { ActivitySnapshotsView } from '@/components/views/ActivitySnapshotsView';
import { UrlIndicator } from '@/components/ui/url-indicator';
import { useApp } from '@/contexts/AppContext';
import { useUser } from '@/contexts/UserContext';
import { Sheet, SheetContent } from '@/components/ui/sheet';

export function MainLayout() {
  const { activeTab } = useApp();
  const { isSecondLevelAdmin } = useUser();
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  const renderMainContent = () => {
    if (isSecondLevelAdmin && (activeTab === 'store-equipment' || activeTab === 'add-user')) {
      return <DashboardView />;
    }

    switch (activeTab) {
      case 'cost-centres':
        // Show fuel gauges instead of cost centers table
        return <FuelGaugesView />;
      case 'store-equipment':
        return <StoreEquipmentView />;
      case 'activity-snapshots':
        return <ActivitySnapshotsView />;
      case 'add-user':
        return <UsersView onBack={() => {}} />;
      case 'dashboard':
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex bg-gray-100 h-screen">
      {/* Sidebar */}
      <aside className="hidden md:block relative flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Sticky Header Container */}
        <div className="sticky top-0 z-50">
          <Header onMenuClick={() => setMobileSidebarOpen(true)} />
          {['dashboard', 'reports', 'activity', 'executive'].includes(activeTab) && <TopNavigation />}
        </div>
        
        <main className="flex-1 overflow-auto">
          {renderMainContent()}
        </main>
      </div>

      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="p-0 w-[280px] sm:w-[320px]">
          <Sidebar mobile onNavigate={() => setMobileSidebarOpen(false)} />
        </SheetContent>
      </Sheet>
      
      {/* URL Indicator for testing */}
      <UrlIndicator />
    </div>
  );
}
