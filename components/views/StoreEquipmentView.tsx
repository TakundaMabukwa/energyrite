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
  id: number;
  branch: string;
  company: string;
  plate: string | null;
  ip_address: string;
  cost_code: string;
  speed: string;
  latitude: string;
  longitude: string;
  loctime: string;
  quality: string;
  mileage: string;
  pocsagstr: string | null;
  head: string | null;
  geozone: string;
  drivername: string | null;
  nameevent: string | null;
  temperature: string;
  address: string;
  fuel_probe_1_level: string;
  fuel_probe_1_volume_in_tank: string;
  fuel_probe_1_temperature: string;
  fuel_probe_1_level_percentage: string;
  fuel_probe_2_level: string | null;
  fuel_probe_2_volume_in_tank: string | null;
  fuel_probe_2_temperature: string | null;
  fuel_probe_2_level_percentage: string | null;
  status: string | null;
  last_message_date: string;
  updated_at: string;
  volume: string;
  theft: boolean;
  theft_time: string | null;
  previous_fuel_level: string | null;
  previous_fuel_time: string | null;
  activity_start_time: string | null;
  activity_duration_hours: string | null;
  total_usage_hours: string;
  daily_usage_hours: string;
  is_active: boolean;
  last_activity_time: string | null;
  fuel_anomaly: string | null;
  fuel_anomaly_note: string | null;
  last_anomaly_time: string | null;
  created_at: string;
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
      
      let url = `http://${process.env.NEXT_PUBLIC_SERVER_URL}/api/energy-rite-reports/realtime-dashboard`;
      
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

  // Load equipment data once from internal energyrite_vehicles endpoint (no filtering)
  const fetchEquipmentData = async () => {
    try {
      setEquipmentLoading(true);
      const resp = await fetch(`http://${process.env.NEXT_PUBLIC_SERVER_URL}/api/energy-rite/vehicles?limit=500`);
      const json = await resp.json();
      const rows = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);

      const equipment: VehicleEquipment[] = rows.map((row: any) => row as VehicleEquipment);
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
    
    // Equipment data is loaded once globally; do not filter per cost center
    
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
        await fetchEquipmentData();
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
                    fetchEquipmentData();
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
                  All Generators
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
                  <div className="gap-4 grid grid-cols-1 md:grid-cols-4 mb-6">

                    

                  </div>

                  {/* Equipment Table */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">ID</th>
                            <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">BRANCH</th>
                            <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">COMPANY</th>
                            <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">COST CODE</th>
                            <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">IP ADDRESS</th>
                            <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">ENGINE STATUS</th>
                            <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">FUEL LEVEL %</th>
                            <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">FUEL VOL (L)</th>
                            {/* <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">LAST UPDATE</th> */}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {equipmentData.map((equipment) => (
                            <tr key={equipment.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4 text-gray-900 text-sm whitespace-nowrap">
                                {equipment.id}
                              </td>
                              <td className="px-4 py-4 text-gray-900 text-sm whitespace-nowrap">
                                {equipment.branch}
                              </td>
                              <td className="px-4 py-4 text-gray-900 text-sm whitespace-nowrap">
                                {equipment.company}
                              </td>
                              <td className="px-4 py-4 text-gray-900 text-sm whitespace-nowrap">
                                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                                  {equipment.cost_code}
                                </code>
                              </td>
                              <td className="px-4 py-4 text-gray-900 text-sm whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Wifi className="w-4 h-4 text-gray-400" />
                                  {equipment.ip_address}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-sm whitespace-nowrap">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  equipment.is_active 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {equipment.is_active ? 'Engine On' : 'Engine Off'}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-gray-900 text-sm whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-blue-600 h-2 rounded-full" 
                                      style={{ 
                                        width: `${Math.min(100, Math.max(0, parseFloat(equipment.fuel_probe_1_level_percentage || '0')))}%` 
                                      }}
                                    ></div>
                                  </div>
                                  <span className="text-xs text-gray-600">
                                    {equipment.fuel_probe_1_level_percentage}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-gray-900 text-sm whitespace-nowrap">
                                {parseFloat(equipment.fuel_probe_1_volume_in_tank || '0').toFixed(1)}L
                              </td>
                              {/* <td className="px-4 py-4 text-gray-900 text-sm whitespace-nowrap">
                                <div className="text-xs text-gray-600">
                                  {new Date(equipment.last_message_date).toLocaleString()}
                                </div>
                              </td> */}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
