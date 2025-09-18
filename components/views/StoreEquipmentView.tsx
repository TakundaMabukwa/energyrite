'use client';

import React, { useState, useEffect } from 'react';
import { HierarchicalTable } from '@/components/ui/hierarchical-table';
import { TopNavigation } from '@/components/layout/TopNavigation';
import { useApp } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Activity, Fuel, AlertTriangle, Clock, Wifi, Building2 } from 'lucide-react';
import { HierarchicalCostCenter } from '@/lib/supabase/cost-centers';

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

interface VehicleEquipment {
  id: string;
  vehicle_id: string;
  cost_code: string;
  ip_address: string;
  branch: string;
  company: string;
  fuel_probe_1_volume_in_tank?: number;
}

export function StoreEquipmentView() {
  const { costCenters, setSelectedRoute, activeTab, selectedRoute, vehicles } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [showVehicles, setShowVehicles] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeData, setRealtimeData] = useState<RealtimeDashboardData | null>(null);
  const [filteredRealtimeData, setFilteredRealtimeData] = useState<RealtimeDashboardData | null>(null);
  const [equipmentData, setEquipmentData] = useState<VehicleEquipment[]>([]);
  const [equipmentLoading, setEquipmentLoading] = useState(false);

  // Fetch real-time dashboard data (same as dashboard)
  const fetchRealtimeData = async (costCenter?: HierarchicalCostCenter) => {
    try {
      setLoading(true);
      setError(null);
      
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
          url += `?${params.toString()}`;
        }
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn('Realtime dashboard endpoint returned non-OK status:', response.status);
        const fallbackData = {
          statistics: {
            total_vehicles: '0',
            theft_incidents: '0',
            vehicles_with_fuel_data: '0',
            total_volume_capacity: '0.00'
          }
        };
        if (costCenter) {
          setFilteredRealtimeData(fallbackData);
        } else {
          setRealtimeData(fallbackData);
        }
        return;
      }
      
      let result: any = null;
      try {
        result = await response.json();
      } catch (e) {
        console.warn('Failed to parse realtime dashboard JSON. Using fallback.');
        const fallbackData = {
          statistics: {
            total_vehicles: '0',
            theft_incidents: '0',
            vehicles_with_fuel_data: '0',
            total_volume_capacity: '0.00'
          }
        };
        if (costCenter) {
          setFilteredRealtimeData(fallbackData);
        } else {
          setRealtimeData(fallbackData);
        }
        return;
      }
      
      if (result.success && result.data) {
        if (costCenter) {
          setFilteredRealtimeData(result.data);
        } else {
          setRealtimeData(result.data);
        }
      } else {
        // Set fallback data if API response is not in expected format
        const fallbackData = {
          statistics: {
            total_vehicles: '0',
            theft_incidents: '0',
            vehicles_with_fuel_data: '0',
            total_volume_capacity: '0.00'
          }
        };
        
        if (costCenter) {
          setFilteredRealtimeData(fallbackData);
        } else {
          setRealtimeData(fallbackData);
        }
      }
    } catch (err) {
      console.error('Error fetching real-time data:', err);
      setError('Failed to fetch real-time data');
      
      // Set fallback data on error
      const fallbackData = {
        statistics: {
          total_vehicles: '0',
          theft_incidents: '0',
          vehicles_with_fuel_data: '0',
          total_volume_capacity: '0.00'
        }
      };
      
      if (costCenter) {
        setFilteredRealtimeData(fallbackData);
      } else {
        setRealtimeData(fallbackData);
      }
    } finally {
      setLoading(false);
    }
  };

  // Load equipment data directly from Energy Rite realtime endpoint
  const fetchEquipmentData = async (costCode: string) => {
    try {
      setEquipmentLoading(true);
      const resp = await fetch('/api/energy-rite-proxy?endpoint=/api/energy-rite/realtime');
      const json = await resp.json();
      const raw = Array.isArray(json) ? json : (Array.isArray(json?.data?.vehicles) ? json.data.vehicles : (Array.isArray(json?.data) ? json.data : (Array.isArray(json?.rows) ? json.rows : [])));
      const matching = Array.isArray(raw) ? raw : [];

      const equipment: VehicleEquipment[] = matching.map((vehicle: any, idx: number) => ({
        id: vehicle.id || vehicle.vehicle_id || `vehicle-${idx + 1}`,
        vehicle_id: vehicle.vehicle_id || vehicle.id || 'N/A',
        cost_code: vehicle.cost_code || costCode || vehicle.costCode || 'N/A',
        ip_address: vehicle.ip_address || vehicle.unitIpAddress || vehicle.ip || 'N/A',
        branch: vehicle.branch || vehicle.branch_name || 'N/A',
        company: vehicle.company || vehicle.company_name || 'N/A',
        fuel_probe_1_volume_in_tank: Number(
          vehicle.fuel_probe_1_volume_in_tank ??
          vehicle.fuel_probe_1_volume ??
          vehicle.volume ?? 0
        )
      }));
      setEquipmentData(equipment);
    } catch (error) {
      console.error('❌ Error building equipment data from context:', error);
      setEquipmentData([]);
    } finally {
      setEquipmentLoading(false);
    }
  };

  // Handle cost center click (same as dashboard)
  const handleCostCenterClick = async (costCenter: HierarchicalCostCenter) => {
    console.log('🎯 Cost center clicked:', costCenter);
    console.log('🎯 Cost center costCode:', costCenter.costCode);
    
    // Set selected route
    setSelectedRoute({
      id: costCenter.id,
      route: costCenter.name || 'Unknown',
      locationCode: costCenter.costCode || 'N/A',
      costCode: costCenter.costCode || undefined
    });
    
    // Fetch real-time data for this cost center
    await fetchRealtimeData(costCenter);
    
    // Fetch equipment data
    if (costCenter.costCode) {
      console.log('🔧 About to fetch equipment data for cost code:', costCenter.costCode);
      await fetchEquipmentData(costCenter.costCode);
    } else {
      console.log('⚠️ No cost code available for this cost center');
    }
    
    // Show vehicles view
    setShowVehicles(true);
    
    // Update URL parameters
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', 'vehicles');
    params.set('route', costCenter.id);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Handle back to table (same as dashboard)
  const handleBackToTable = () => {
    // No-op in simplified view
    return;
  };

  // Initialize data (same as dashboard)
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        await fetchRealtimeData();
        await fetchEquipmentData('');
      } catch (error) {
        console.error('Error initializing data:', error);
        setError('Failed to initialize data');
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  // Handle URL parameters (same as dashboard)
  useEffect(() => {
    const view = searchParams.get('view');
    const route = searchParams.get('route');
    
    if (view === 'vehicles' && route) {
      const foundCostCenter = costCenters.find(cc => cc.id === route);
      if (foundCostCenter) {
        setSelectedRoute({
          id: foundCostCenter.id,
          route: foundCostCenter.name || 'Unknown',
          locationCode: foundCostCenter.costCode || 'N/A',
          costCode: foundCostCenter.costCode || undefined
        });
        setShowVehicles(true);
        fetchRealtimeData(foundCostCenter);
        if (foundCostCenter.costCode) {
          fetchEquipmentData(foundCostCenter.costCode);
        }
      }
    }
  }, [searchParams, costCenters]);

  // Show vehicles view when a cost center is selected
  if (showVehicles) {
    return (
      <div className="flex flex-col h-full">
        <TopNavigation />
        
        <div className="flex-1 space-y-6 p-6">
          {/* Real-time Dashboard Overview */}
          {(realtimeData || filteredRealtimeData) && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold text-gray-900 text-lg">
                  All Equipment
                </h2>
                <button
                  onClick={() => {
                    fetchRealtimeData();
                    fetchEquipmentData('');
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

          {/* Equipment Details */}
          <Card className="shadow-sm border border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="font-semibold text-gray-900 text-lg">
                  Equipment Details
                </CardTitle>
                <Badge variant="outline" className="text-gray-600">
                  All Vehicles
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {equipmentLoading ? (
                <div className="py-12 text-gray-500 text-center">
                  <RefreshCw className="mx-auto mb-4 w-8 h-8 text-gray-400 animate-spin" />
                  <p className="font-medium text-lg">Loading Equipment...</p>
                  <p className="text-sm">Fetching vehicles for {selectedRoute?.name}</p>
                </div>
              ) : equipmentData.length === 0 ? (
                <div className="py-12 text-gray-500 text-center">
                  <Building2 className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                  <p className="font-medium text-lg">No Data Available</p>
                  <p className="text-sm">No equipment data found for {selectedRoute?.name}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="gap-4 grid grid-cols-1 md:grid-cols-3 mb-6">
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Building2 className="w-8 h-8 text-blue-600" />
                          <div>
                            <p className="font-medium text-blue-600 text-sm">Total Equipment</p>
                            <p className="font-bold text-blue-800 text-2xl">{equipmentData.length}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Wifi className="w-8 h-8 text-green-600" />
                          <div>
                            <p className="font-medium text-green-600 text-sm">Online Devices</p>
                            <p className="font-bold text-green-800 text-2xl">
                              {equipmentData.filter(eq => eq.ip_address !== 'N/A').length}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-orange-50 border-orange-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Fuel className="w-8 h-8 text-orange-600" />
                          <div>
                            <p className="font-medium text-orange-600 text-sm">Active Equipment</p>
                            <p className="font-bold text-orange-800 text-2xl">
                              {equipmentData.length}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Equipment Table */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">BRANCH</th>
                          <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">IP ADDRESS</th>
                          <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">FUEL VOL (L)</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {equipmentData.map((equipment) => (
                          <tr key={equipment.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 text-gray-900 text-sm whitespace-nowrap">
                              {equipment.branch}
                            </td>
                            <td className="px-4 py-4 text-gray-900 text-sm whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Wifi className="w-4 h-4 text-gray-400" />
                                {equipment.ip_address}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-gray-900 text-sm whitespace-nowrap">
                              {Number(equipment.fuel_probe_1_volume_in_tank || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main Equipment view (same structure as dashboard)
  return (
    <div className="flex flex-col h-full">
      <TopNavigation />
      
      <div className="flex-1 space-y-6 p-6">
        {/* Real-time Dashboard Overview */}
        {(realtimeData || filteredRealtimeData) && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-gray-900 text-lg">
                {filteredRealtimeData && selectedRoute ? 
                  `Equipment Dashboard - ${selectedRoute.name}` : 
                  'Real-time Equipment Dashboard Overview'
                }
              </h2>
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
          title="Equipment"
          subtitle="Vehicle and equipment management by cost center"
          showSearch={true}
          showFilters={true}
        />
      </div>
    </div>
  );
}
