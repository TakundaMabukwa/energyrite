'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, RefreshCw, Activity, Clock, AlertTriangle } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';

interface ActivityReportViewProps {
  onBack?: () => void;
}

interface ActivityStatistics {
  // Summary fields from /reports/activity-report
  total_sites?: number;
  engine_on_events?: number;
  engine_off_events?: number;
  total_fuel_used?: number;
  total_fuel_filled?: number;
  irregularities_count?: number;
  // Legacy/extra fields (kept optional to avoid breakage)
  total_vehicles?: number;
  currently_active?: number;
  active_vehicles?: number;
  vehicles_with_engine_data?: number;
  vehicles_over_24h?: number;
  avg_activity_duration?: number;
  max_activity_duration?: number;
  total_activity_hours?: number;
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
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dateInput, setDateInput] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
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
    const nextDate = e.target.value;
    setDateInput(nextDate);
    setSelectedDate(nextDate);
    // Fetch only if both date and month are selected
    setTimeout(() => {
      if ((selectedMonth || '').length > 0 && (nextDate || '').length > 0) {
        fetchActivityData(nextDate);
      }
    }, 0);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const month = e.target.value; // YYYY-MM
    setSelectedMonth(month);
    // If date not chosen yet, default to first day of month but do not fetch
    if (!selectedDate) {
      const firstDay = `${month}-01`;
      setDateInput(firstDay);
      setSelectedDate(firstDay);
    }
    // Fetch only if both date and month are selected
    setTimeout(() => {
      const dateToUse = selectedDate || `${month}-01`;
      if ((month || '').length > 0 && (dateToUse || '').length > 0) {
        fetchActivityData(dateToUse);
      }
    }, 0);
  };

  // Fetch activity data from Energy Rite server
  const fetchActivityData = async (forDate?: string) => {
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
            params.append('cost_code', selectedRoute.costCode);
          }
          
          if (params.toString()) {
            url += `&${params.toString()}`;
          }
          console.log('🔍 Using query parameters for activity:', url);
        }
        
        return url;
      };
      
      // Fetch activity report (summary for selected date)
      const targetDate = (forDate || selectedDate || '').toString();
      const statsResponse = await fetch(buildUrl(`/api/energy-rite/reports/activity-report?date=${targetDate}`));
      if (statsResponse.ok) {
        const statsResult = await statsResponse.json();
        if (statsResult.success) {
          const data = statsResult.data || {};
          const summary = data.summary || {};
          setActivityStats({
            total_sites: Number(summary.total_sites || 0),
            engine_on_events: Number(summary.engine_on_events || 0),
            engine_off_events: Number(summary.engine_off_events || 0),
            total_fuel_used: Number(parseFloat(summary.total_fuel_used || '0') || 0),
            total_fuel_filled: Number(parseFloat(summary.total_fuel_filled || '0') || 0),
            irregularities_count: Number(summary.irregularities_count || 0),
          });

          // Derive per-site activity for the selected date to populate the table
          const sites: any[] = Array.isArray(data.sites) ? data.sites : [];
          const derivedActiveVehicles = sites.map((s: any, idx: number) => {
            const activities: any[] = Array.isArray(s.activities) ? s.activities : [];
            const lastActivity = activities.length ? activities[activities.length - 1] : null;
            const status = lastActivity?.type === 'ENGINE_ON' ? 'ON' : 'OFF';
            return {
              id: idx + 1,
              branch: s.branch,
              company: s.company,
              plate: s.cost_code || String(idx + 1),
              current_status: status,
              engine_on_time: s.first_activity || targetDate,
              hours_running: Number(s.running_duration || 0),
              activity_start_time: s.first_activity || targetDate,
              activity_duration_hours: Number(s.running_duration || 0),
            } as ActiveVehicle;
          });
          setActiveVehicles(derivedActiveVehicles);

          // Vehicles/sites running over 24h for the selected date
          const over24 = sites.filter((s: any) => Number(s.running_duration || 0) >= 24).map((s: any, idx: number) => ({
            id: idx + 1,
            branch: s.branch,
            company: s.company,
            plate: s.cost_code || String(idx + 1),
            current_status: 'ON',
            engine_on_time: s.first_activity || targetDate,
            hours_running: Number(s.running_duration || 0),
            activity_start_time: s.first_activity || targetDate,
            activity_duration_hours: Number(s.running_duration || 0),
          } as ActiveVehicle));
          setVehiclesOver24h(over24);
        }
      }
      // Removed fetching of current active endpoints to ensure data reflects the selected date only
    } catch (err) {
      console.error('Error fetching activity data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch activity data');
      toast({
        title: 'Failed to load activity report',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      if (!error && selectedDate) {
        toast({
          title: 'Activity report loaded',
          description: `Data for ${selectedDate} fetched successfully.`
        });
      }
    }
  };

  useEffect(() => {
    // Do not auto-fetch on mount or route change. Wait for user to select date & month.
    setActivityStats(null);
    setActiveVehicles([]);
    setVehiclesOver24h([]);
    setLoading(false);
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
          {/* Controls moved to the activity card header */}
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
                    <p className="font-bold text-gray-900 text-2xl">{activityStats.total_sites ?? 0}</p>
                    <p className="text-gray-600 text-sm">Total Sites</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="font-bold text-gray-900 text-2xl">{activityStats.engine_on_events ?? 0}</p>
                    <p className="text-gray-600 text-sm">Engine ON</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-purple-500" />
                  <div>
                    <p className="font-bold text-gray-900 text-2xl">{activityStats.engine_off_events ?? 0}</p>
                    <p className="text-gray-600 text-sm">Engine OFF</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-orange-500" />
                  <div>
                    <p className="font-bold text-gray-900 text-2xl">{activityStats.irregularities_count ?? 0}</p>
                    <p className="text-gray-600 text-sm">Irregularities</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Active Vehicles Table */}
        <Card className="shadow-sm border border-gray-200">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="font-semibold text-gray-900 text-xl">{getCostCenterName()} Activity</CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateInput}
                  onChange={handleDateChange}
                  className="h-9"
                />
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  className="h-9"
                />
                <Button variant="outline" size="sm" onClick={() => fetchActivityData()} disabled={!selectedDate || !selectedMonth}>
                  <RefreshCw className="mr-2 w-4 h-4" />
                  Refresh
                </Button>
              </div>
            </div>
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
