'use client';

import React, { useState, useEffect } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { HierarchicalTable } from '@/components/ui/hierarchical-table';
import { FuelGaugesView } from '@/components/views/FuelGaugesView';
import { CostCentersView } from '@/components/views/CostCentersView';
import { FuelReportsView } from '@/components/views/FuelReportsView';
import { ActivityReportView } from '@/components/views/ActivityReportView';
import { ExecutiveDashboardView } from '@/components/views/ExecutiveDashboardView';
import { StoreEquipmentView } from '@/components/views/StoreEquipmentView';
import { TopNavigation } from '@/components/layout/TopNavigation';
import { useApp } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Activity, Fuel, AlertTriangle, Clock } from 'lucide-react';
import { HierarchicalCostCenter } from '@/lib/supabase/cost-centers';
import { costCenterService } from '@/lib/supabase/cost-centers';

interface RealtimeDashboardData {
  statistics?: {
    total_vehicles?: string;
    theft_incidents?: string;
    vehicles_with_fuel_data?: string;
    total_volume_capacity?: string;
  };
  recentThefts?: any[];
  companyBreakdown?: any[];
  branchBreakdown?: any[];
}

export function DashboardView() {
  const { costCenters, setSelectedRoute, activeTab, updateFuelDataForCostCenter } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [showFuelGauges, setShowFuelGauges] = useState(false);
  const [showCostCenters, setShowCostCenters] = useState(false);
  const [showFuelReports, setShowFuelReports] = useState(false);
  const [showActivityReport, setShowActivityReport] = useState(false);
  const [showExecutiveDashboard, setShowExecutiveDashboard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeData, setRealtimeData] = useState<RealtimeDashboardData | null>(null);
  const [filteredRealtimeData, setFilteredRealtimeData] = useState<RealtimeDashboardData | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  // Fetch real-time dashboard data
  const fetchRealtimeData = async (costCenter?: HierarchicalCostCenter) => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the proxy route instead of direct API call
      let url = '/api/energy-rite-proxy?endpoint=/api/energy-rite-reports/realtime-dashboard';
      
      // Add cost center specific parameters if provided
      if (costCenter) {
        const params = new URLSearchParams();
        if (costCenter.company) {
          params.append('company', costCenter.company);
        }
        if (costCenter.branch) {
          params.append('branch', costCenter.branch);
        }
        if (costCenter.costCode) {
          params.append('costCenterId', costCenter.costCode);
        }
        
        if (params.toString()) {
          url += `&${params.toString()}`;
        }
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setIsUsingFallback(false);
        if (costCenter) {
          setFilteredRealtimeData(result.data);
        } else {
          setRealtimeData(result.data);
        }
      } else {
        // Set fallback data if API response is not in expected format
        const fallbackData = {
          statistics: {
            total_vehicles: '103',
            theft_incidents: '3',
            vehicles_with_fuel_data: '95',
            total_volume_capacity: '1250.50'
          },
          recentThefts: [],
          companyBreakdown: [],
          branchBreakdown: []
        };
        
        setIsUsingFallback(true);
        if (costCenter) {
          setFilteredRealtimeData(fallbackData);
        } else {
          setRealtimeData(fallbackData);
        }
      }
    } catch (err) {
      console.error('Error fetching real-time data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      
      // Set fallback data on error - provide more realistic fallback data
      const fallbackData = {
        statistics: {
          total_vehicles: '103',
          theft_incidents: '3',
          vehicles_with_fuel_data: '95',
          total_volume_capacity: '1250.50'
        },
        recentThefts: [],
        companyBreakdown: [],
        branchBreakdown: []
      };
      
      console.log('🔄 Using fallback data due to API error');
      setIsUsingFallback(true);
      
      if (costCenter) {
        setFilteredRealtimeData(fallbackData);
      } else {
        setRealtimeData(fallbackData);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealtimeData();
  }, []);

  // Handle URL parameters for sub-views
  useEffect(() => {
    const view = searchParams.get('view');
    const route = searchParams.get('route');
    
    if (view && route) {
      // Reset all views first
      setShowFuelGauges(false);
      setShowCostCenters(false);
      setShowFuelReports(false);
      setShowActivityReport(false);
      setShowExecutiveDashboard(false);
      
      // Show the appropriate view based on URL parameter
      switch (view) {
        case 'fuel-gauges':
          setShowFuelGauges(true);
          break;
        case 'cost-centers':
          setShowCostCenters(true);
          break;
        case 'fuel-reports':
          setShowFuelReports(true);
          break;
        case 'activity-report':
          setShowActivityReport(true);
          break;
        case 'executive-dashboard':
          setShowExecutiveDashboard(true);
          break;
        default:
          break;
      }
    }
  }, [searchParams]);

  const handleCostCenterClick = async (costCenter: HierarchicalCostCenter) => {
    setSelectedRoute(costCenter as any);
    
    const params = new URLSearchParams(searchParams.toString());
    params.set('route', costCenter.id);
    
    // Fetch and update vehicle data for this cost center
    await updateFuelDataForCostCenter(costCenter);
    
    // Fetch filtered dashboard data for this cost center
    await fetchRealtimeData(costCenter);
    
      // Navigate based on active tab
      if (activeTab === 'reports') {
        setShowFuelReports(true);
        params.set('view', 'fuel-reports');
      } else if (activeTab === 'activity') {
        setShowActivityReport(true);
        params.set('view', 'activity-report');
      } else if (activeTab === 'executive') {
        setShowExecutiveDashboard(true);
        params.set('view', 'executive-dashboard');
      } else {
        setShowFuelGauges(true);
        params.set('view', 'fuel-gauges');
    }
    
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleBackToTable = () => {
    setShowFuelGauges(false);
    setShowCostCenters(false);
    setShowFuelReports(false);
    setShowActivityReport(false);
    setShowExecutiveDashboard(false);
    setSelectedRoute(null);
    
    // Clear filtered data when going back to main view
    setFilteredRealtimeData(null);
    
    // Clear view and route parameters from URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete('view');
    params.delete('route');
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'reports': return 'Reports';
      case 'activity': return 'Activity Report';
      case 'executive': return 'Executive Dashboard';
      case 'store': return 'Store Equipment';
      default: return 'Cost Centers';
    }
  };

  const getPageSubtitle = () => {
    switch (activeTab) {
      case 'reports': return 'Generate and view comprehensive fleet reports';
      case 'activity': return 'Monitor real-time fleet activity and performance metrics';
      case 'executive': return 'High-level overview and strategic insights';
      case 'store': return 'Manage store equipment and units';
      default: return 'Hierarchical view of cost centers and their associated codes';
    }
  };

  const columns = [
    { 
      key: 'name', 
      label: 'Cost Center', 
      sortable: true 
    },
    { 
      key: 'costCode', 
      label: 'Location', 
      sortable: true 
    }
  ];

  if (showFuelGauges) {
    return <FuelGaugesView onBack={handleBackToTable} />;
  }

  if (showCostCenters) {
    return <CostCentersView onBack={handleBackToTable} />;
  }

  if (showFuelReports) {
    return <FuelReportsView onBack={handleBackToTable} />;
  }

  if (showActivityReport) {
    return <ActivityReportView onBack={handleBackToTable} />;
  }

  if (showExecutiveDashboard) {
    return <ExecutiveDashboardView onBack={handleBackToTable} />;
  }

  // Show Store Equipment view when store tab is active
  if (activeTab === 'store') {
    return <StoreEquipmentView />;
  }

  return (
    <div className="flex flex-col h-full">
      <TopNavigation />
      
      <div className="flex-1 space-y-6 p-6">
        {/* Real-time Dashboard Overview */}
        {(realtimeData || filteredRealtimeData) && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-gray-900 text-lg">
                  {filteredRealtimeData && selectedRoute ? 
                    `Dashboard - ${selectedRoute.name}` : 
                    'Real-time Dashboard Overview'
                  }
                </h2>
                {isUsingFallback && (
                  <Badge variant="outline" className="bg-amber-50 border-amber-300 text-amber-600">
                    Demo Data
                  </Badge>
                )}
                {error && (
                  <Badge variant="outline" className="bg-red-50 border-red-300 text-red-600">
                    API Error
                  </Badge>
                )}
              </div>
              <button
                onClick={() => {
                  if (selectedRoute) {
                    fetchRealtimeData(selectedRoute as HierarchicalCostCenter);
                  } else {
                    fetchRealtimeData();
                  }
                }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-white text-sm"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <Activity className="w-8 h-8 text-blue-500" />
                    <div>
                      <p className="font-bold text-gray-900 text-2xl">{(filteredRealtimeData || realtimeData)?.statistics?.total_vehicles || 0}</p>
                      <p className="text-gray-600 text-sm">
                        Total Vehicles
                        {filteredRealtimeData && selectedRoute && (
                          <span className="ml-2 text-blue-600 text-xs">({selectedRoute.name})</span>
                        )}
                      </p>
                    </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <Clock className="w-8 h-8 text-green-500" />
                    <div>
                      <p className="font-bold text-gray-900 text-2xl">{(filteredRealtimeData || realtimeData)?.statistics?.vehicles_with_fuel_data || 0}</p>
                      <p className="text-gray-600 text-sm">
                        Vehicles with Fuel Data
                        {filteredRealtimeData && selectedRoute && (
                          <span className="ml-2 text-blue-600 text-xs">({selectedRoute.name})</span>
                        )}
                      </p>
                    </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <Fuel className="w-8 h-8 text-amber-500" />
                    <div>
                      <p className="font-bold text-gray-900 text-2xl">{(filteredRealtimeData || realtimeData)?.statistics?.total_volume_capacity ? parseFloat((filteredRealtimeData || realtimeData)?.statistics?.total_volume_capacity || '0').toFixed(1) : '0.0'}L</p>
                      <p className="text-gray-600 text-sm">
                        Total Volume Capacity
                        {filteredRealtimeData && selectedRoute && (
                          <span className="ml-2 text-blue-600 text-xs">({selectedRoute.name})</span>
                        )}
                      </p>
                    </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                    <div>
                      <p className="font-bold text-gray-900 text-2xl">{(filteredRealtimeData || realtimeData)?.statistics?.theft_incidents || 0}</p>
                      <p className="text-gray-600 text-sm">
                        Theft Incidents
                        {filteredRealtimeData && selectedRoute && (
                          <span className="ml-2 text-blue-600 text-xs">({selectedRoute.name})</span>
                        )}
                      </p>
                    </div>
                </div>
              </CardContent>
            </Card>
            </div>
          </div>
        )}

        {/* Main Hierarchical Table */}
        <HierarchicalTable
          data={costCenters}
          onRowClick={handleCostCenterClick}
          title={getPageTitle()}
          subtitle={getPageSubtitle()}
          showSearch={true}
          showFilters={true}
        />
      </div>
    </div>
  );
}