'use client';

import React from 'react';
import { FuelGaugesView } from '@/components/views/FuelGaugesView';
import { CostCentersView } from '@/components/views/CostCentersView';
import { FuelReportsView } from '@/components/views/FuelReportsView';
import { ActivityReportView } from '@/components/views/ActivityReportView';
import { ExecutiveDashboardView } from '@/components/views/ExecutiveDashboardView';
import { StoreEquipmentView } from '@/components/views/StoreEquipmentView';
import { useApp } from '@/contexts/AppContext';

export function DashboardView() {
  const { activeTab } = useApp();

  // Route to appropriate view based on active tab
  switch (activeTab) {
    case 'reports':
      return <FuelReportsView onBack={() => {}} />;
    case 'activity':
      return <ActivityReportView onBack={() => {}} />;
    case 'executive':
      return <ExecutiveDashboardView onBack={() => {}} />;
    case 'store':
      return <StoreEquipmentView />;
    default:
      // Show Fuel Gauges as the default dashboard view
      return <FuelGaugesView onBack={() => {}} />;
  }
}