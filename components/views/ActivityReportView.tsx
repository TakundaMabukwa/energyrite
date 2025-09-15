'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, RefreshCw, Activity, Clock, AlertTriangle } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

interface ActivityReportViewProps {
  onBack?: () => void;
}

interface ActivityStatistics {
  total_vehicles: number;
  currently_active: number;
  active_vehicles: number;
  vehicles_with_engine_data: number;
  vehicles_over_24h: number;
  avg_activity_duration: number;
  max_activity_duration: number;
  total_activity_hours: number;
}

interface ActiveVehicle {
  id: number;
  branch: string;
  company: string;
  plate: string;
  current_status: string;
  engine_on_time: string;
  hours_running: number;
  activity_start_time: string;
  activity_duration_hours: number;
}

export function ActivityReportView({ onBack }: ActivityReportViewProps) {
  const { selectedRoute } = useApp();
  const [selectedDate, setSelectedDate] = useState('2025-08-01');
  const [dateInput, setDateInput] = useState('2025-08-01');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityStats, setActivityStats] = useState<ActivityStatistics | null>(null);
  const [activeVehicles, setActiveVehicles] = useState<ActiveVehicle[]>([]);
  const [vehiclesOver24h, setVehiclesOver24h] = useState<ActiveVehicle[]>([]);

  const getCostCenterName = () => {
    if (selectedRoute && 'name' in selectedRoute) {
      return selectedRoute.name as string;
    }
    return 'Cost Centre (13)';
  };

  const getBreadcrumbPath = () => {
    if (selectedRoute && 'name' in selectedRoute) {
      const costCenterName = selectedRoute.name as string;
      return `Energyrite => KFC => ${costCenterName} - (COST CODE: ${selectedRoute.costCode || 'KFC-ALCFOOD'})`;
    }
    return 'Energyrite => KFC => Alchemy Foods - (COST CODE: KFC-ALCFOOD)';
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateInput(e.target.value);
    setSelectedDate(e.target.value);
  };

  // Fetch activity data from Energy Rite server
  const fetchActivityData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters based on selected cost center
      const buildUrl = (endpoint: string) => {
        let url = `/api/energy-rite-proxy?endpoint=${endpoint}`;
        
        if (selectedRoute && ('costCode' in selectedRoute || 'branch' in selectedRoute)) {
          // Use query parameters for filtering (most reliable approach)
          const params = new URLSearchParams();
          if (selectedRoute.costCode) {
            params.append('costCenterId', selectedRoute.costCode);
          }
          if (selectedRoute.company) {
            params.append('company', selectedRoute.company);
          }
          if (selectedRoute.branch) {
            params.append('branch', selectedRoute.branch);
          }
          
          if (params.toString()) {
            url += `&${params.toString()}`;
          }
          console.log('🔍 Using query parameters for activity:', url);
        }
        
        return url;
      };
      
      // Fetch activity statistics
      const statsResponse = await fetch(buildUrl('/api/energy-rite-vehicles/activity-statistics'));
      if (statsResponse.ok) {
        const statsResult = await statsResponse.json();
        if (statsResult.success) {
          setActivityStats(statsResult.data);
        }
      }

      // Fetch active vehicles
      const activeResponse = await fetch(buildUrl('/api/energy-rite-vehicles/active'));
      if (activeResponse.ok) {
        const activeResult = await activeResponse.json();
        if (activeResult.success) {
          setActiveVehicles(activeResult.data);
        }
      }

      // Fetch vehicles over 24 hours
      const over24hResponse = await fetch(buildUrl('/api/energy-rite-vehicles/over-24-hours'));
      if (over24hResponse.ok) {
        const over24hResult = await over24hResponse.json();
        if (over24hResult.success) {
          setVehiclesOver24h(over24hResult.data);
        }
      }
    } catch (err) {
      console.error('Error fetching activity data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch activity data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityData();
  }, [selectedRoute]);

  return (
    <div className="bg-gray-50 h-full">
      {/* Header */}
      <div className="bg-white p-6 border-gray-200 border-b">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ChevronLeft className="mr-2 w-4 h-4" />
                Back
              </Button>
            )}
            <div>
              <h1 className="font-semibold text-blue-600 text-2xl">{getCostCenterName()}</h1>
              <p className="mt-1 text-gray-600 text-sm">
                {getBreadcrumbPath()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={fetchActivityData}>
              <RefreshCw className="mr-2 w-4 h-4" />
              Refresh
            </Button>
            {activityStats && (
              <div className="text-gray-500 text-sm">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6 p-6">
        {/* Activity Statistics Cards */}
        {activityStats && (
          <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Activity className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="font-bold text-gray-900 text-2xl">{activityStats.total_vehicles}</p>
                    <p className="text-gray-600 text-sm">Total Vehicles</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="font-bold text-gray-900 text-2xl">{activityStats.currently_active}</p>
                    <p className="text-gray-600 text-sm">Currently Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-orange-500" />
                  <div>
                    <p className="font-bold text-gray-900 text-2xl">{activityStats.vehicles_over_24h}</p>
                    <p className="text-gray-600 text-sm">Over 24 Hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-purple-500" />
                  <div>
                    <p className="font-bold text-gray-900 text-2xl">{activityStats.avg_activity_duration.toFixed(1)}h</p>
                    <p className="text-gray-600 text-sm">Avg Duration</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Active Vehicles Table */}
        <Card className="shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="font-semibold text-gray-900 text-xl">Currently Active Vehicles</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-center">
                  <div className="mx-auto mb-4 border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
                  <p className="text-gray-600">Loading active vehicles...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-center">
                  <div className="mx-auto mb-4 text-red-500 text-4xl">⚠️</div>
                  <p className="mb-4 text-red-600">Error loading data</p>
                  <p className="mb-4 text-gray-600">{error}</p>
                  <Button onClick={fetchActivityData} variant="outline">
                    <RefreshCw className="mr-2 w-4 h-4" />
                    Retry
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#1e3a5f] text-white">
                    <tr>
                      <th className="px-6 py-4 font-medium text-sm text-left">Plate</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Branch</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Company</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Status</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Hours Running</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Started</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {activeVehicles.length > 0 ? (
                      activeVehicles.map((vehicle) => (
                        <tr key={vehicle.id}>
                          <td className="px-6 py-4 font-medium text-gray-900 text-sm">{vehicle.plate}</td>
                          <td className="px-6 py-4 text-gray-900 text-sm">{vehicle.branch}</td>
                          <td className="px-6 py-4 text-gray-900 text-sm">{vehicle.company}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className="bg-green-100 px-2 py-1 rounded-full text-green-800 text-xs">
                              {vehicle.current_status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-900 text-sm">{vehicle.hours_running.toFixed(1)}h</td>
                          <td className="px-6 py-4 text-gray-900 text-sm">
                            {new Date(vehicle.activity_start_time).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className="text-gray-500">
                            <p className="text-lg">No active vehicles</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vehicles Over 24 Hours */}
        {vehiclesOver24h.length > 0 && (
          <Card className="shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-semibold text-gray-900 text-xl">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Vehicles Running Over 24 Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-orange-50 text-orange-800">
                    <tr>
                      <th className="px-6 py-4 font-medium text-sm text-left">Plate</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Branch</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Duration</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Started</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {vehiclesOver24h.map((vehicle) => (
                      <tr key={vehicle.id}>
                        <td className="px-6 py-4 font-medium text-gray-900 text-sm">{vehicle.plate}</td>
                        <td className="px-6 py-4 text-gray-900 text-sm">{vehicle.branch}</td>
                        <td className="px-6 py-4 font-medium text-orange-600 text-sm">
                          {vehicle.activity_duration_hours.toFixed(1)}h
                        </td>
                        <td className="px-6 py-4 text-gray-900 text-sm">
                          {new Date(vehicle.activity_start_time).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="right-4 bottom-4 absolute text-gray-400 text-xs">
        0.10.
      </div>
    </div>
  );
}
