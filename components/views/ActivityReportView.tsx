'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TopNavigation } from '@/components/layout/TopNavigation';
import { RefreshCw, Activity, Clock, AlertTriangle } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import { formatForDisplay } from '@/lib/utils/date-formatter';

interface ActivityReportViewProps {
  onBack?: () => void;
}

interface ActivityStatistics {
  // Summary fields from /reports/operating-sessions
  total_sessions?: number;
  completed_sessions?: number;
  ongoing_sessions?: number;
  total_operating_hours?: number;
  total_fuel_usage?: number;
  total_fuel_filled?: number;
  average_efficiency?: number;
}

interface SiteDayRow {
  id: string;
  branch: string;
  company: string;
  cost_code: string;
  session_date: string;
  session_start_time: string;
  session_end_time: string | null;
  operating_hours: number;
  opening_percentage: number;
  opening_fuel: number;
  midday_percentage: number;
  midday_fuel: number;
  closing_percentage: number;
  closing_fuel: number;
  total_usage: number;
  total_fill: number;
  liter_usage_per_hour: number;
  cost_for_usage: number;
  session_status: string;
}

export function ActivityReportView({ onBack }: ActivityReportViewProps) {
  const { selectedRoute } = useApp();
  const { userCostCode, isAdmin } = useUser();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dateInput, setDateInput] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sessionFilter, setSessionFilter] = useState<'all' | 'completed' | 'ongoing'>('all');
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityStats, setActivityStats] = useState<ActivityStatistics | null>(null);
  const [siteRows, setSiteRows] = useState<SiteDayRow[]>([]);
  const [vehiclesOver24h, setVehiclesOver24h] = useState<never[]>([]);

  const getCostCenterName = () => {
    if (isAdmin) {
      return 'All Cost Centers';
    }
    if (userCostCode) {
      return `Cost Centre (${userCostCode})`;
    }
    return 'Activity Reports';
  };

  const getBreadcrumbPath = () => {
    if (isAdmin) {
      return 'Energyrite => All Cost Centers - (ADMIN VIEW)';
    }
    if (userCostCode) {
      return `Energyrite => User Cost Center - (COST CODE: ${userCostCode})`;
    }
    return 'Energyrite => Activity Reports';
  };

  // Filter sessions based on selected filter
  const getFilteredSessions = () => {
    if (sessionFilter === 'all') {
      return siteRows;
    }
    return siteRows.filter(row => {
      if (sessionFilter === 'completed') {
        return row.session_status === 'NORMAL' || row.session_status === 'COMPLETED';
      }
      if (sessionFilter === 'ongoing') {
        return row.session_status === 'IRREGULAR'; // Show irregular snapshots as "ongoing"
      }
      return true;
    });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextDate = e.target.value;
    setDateInput(nextDate);
    setSelectedDate(nextDate);
    // Fetch when date is selected (no month dependency)
    setTimeout(() => {
      if ((nextDate || '').length > 0) {
        fetchActivityData(nextDate);
      }
    }, 0);
  };


  // Fetch engine sessions data from Energy Rite server
  const fetchActivityData = async (forDate?: string) => {
    const targetDate = forDate || selectedDate || '';
    
    try {
      setLoading(true);
      setError(null);
      
      // Build URL for engine sessions endpoint
      const params = new URLSearchParams();
      
      if (targetDate) params.append('date', targetDate);
      
      // Only add cost_code filter if user is not admin
      if (!isAdmin && userCostCode) {
        params.append('cost_code', userCostCode);
      }
      const sessionsUrl = `http://${process.env.NEXT_PUBLIC_SERVER_URL}/api/energy-rite/reports/activity-report${params.toString() ? `?${params.toString()}` : ''}`;
      const sessionsResponse = await fetch(sessionsUrl);
      
      if (sessionsResponse.ok) {
        const sessionsResult = await sessionsResponse.json();
        if (sessionsResult.success) {
          const data = sessionsResult.data || {};
          const summary = data.summary || {};
          
          // Map sites to rows for table display, filtering out empty cost codes
          const sites: any[] = Array.isArray(data.sites) ? data.sites : [];
          const filteredSites = sites
            .filter((site: any) => site.cost_code && site.cost_code.trim() !== '') // Only show rows with non-empty cost codes
            .filter((site: any) => site.company && site.company.trim() !== ''); // Only show rows with non-empty company
          
          // Calculate statistics from filtered sites
          const totalSites = filteredSites.length;
          const totalFuelUsed = filteredSites.reduce((sum, site) => sum + Number(site.total_fuel_used || 0), 0);
          const totalFuelFilled = filteredSites.reduce((sum, site) => sum + Number(site.total_fuel_filled || 0), 0);
          const avgEfficiency = totalSites > 0 ? (totalFuelUsed / totalSites) : 0;
          
          // Set activity statistics from calculated data
          setActivityStats({
            total_sessions: totalSites,
            completed_sessions: totalSites, // All sites have snapshots
            ongoing_sessions: 0, // Snapshots don't track ongoing sessions
            total_operating_hours: 0, // Not available in snapshots
            total_fuel_usage: totalFuelUsed,
            total_fuel_filled: totalFuelFilled,
            average_efficiency: avgEfficiency,
          });

          const rows: SiteDayRow[] = filteredSites.map((site: any, idx: number) => ({
            id: site.branch || idx + 1,
            branch: site.branch || '',
            company: site.company || '',
            cost_code: site.cost_code || '',
            session_date: data.date || '',
            session_start_time: site.first_snapshot || '',
            session_end_time: site.last_snapshot || null,
            operating_hours: 0, // Not available in snapshots
            opening_percentage: Number(site.fuel_level_morning || 0),
            opening_fuel: Number(site.fuel_level_morning || 0),
            midday_percentage: Number(site.fuel_level_midday || 0),
            midday_fuel: Number(site.fuel_level_midday || 0),
            closing_percentage: Number(site.fuel_level_evening || 0),
            closing_fuel: Number(site.fuel_level_evening || 0),
            total_usage: Number(site.total_fuel_used || 0),
            total_fill: Number(site.total_fuel_filled || 0),
            liter_usage_per_hour: 0, // Not available in snapshots
            cost_for_usage: 0, // Not available in snapshots
            session_status: site.irregularities_count > 0 ? 'IRREGULAR' : 'NORMAL',
          }));
          
          setSiteRows(rows);
        }
      }
    } catch (err) {
      console.error('Error fetching snapshots data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch snapshots data');
      toast({
        title: 'Failed to load snapshots',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      if (!error && targetDate) {
        const dateDescription = `Snapshots for ${targetDate} fetched successfully.`;
        toast({
          title: 'Snapshots loaded',
          description: dateDescription
        });
      }
    }
  };

  useEffect(() => {
    // Auto-fetch data on load for user's cost code (or all data for admin)
    if (userCostCode || isAdmin) {
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
      setDateInput(today);
      fetchActivityData(today);
    }
  }, [userCostCode, isAdmin]);

  return (
    <div className="bg-gray-50 h-full">
      <TopNavigation />

      {/* Main Content */}
      <div className="space-y-6 p-6">
        {/* Snapshots Statistics Cards */}
        {activityStats && (
          <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Activity className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="font-bold text-gray-900 text-2xl">{activityStats.total_sessions ?? 0}</p>
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
                    <p className="font-bold text-gray-900 text-2xl">{activityStats.total_fuel_usage?.toFixed(1) ?? '0.0'}</p>
                    <p className="text-gray-600 text-sm">Fuel Usage (L)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-purple-500" />
                  <div>
                    <p className="font-bold text-gray-900 text-2xl">{activityStats.total_fuel_filled?.toFixed(1) ?? '0.0'}</p>
                    <p className="text-gray-600 text-sm">Fuel Filled (L)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-orange-500" />
                  <div>
                    <p className="font-bold text-gray-900 text-2xl">{activityStats.average_efficiency?.toFixed(2) ?? '0.00'}</p>
                    <p className="text-gray-600 text-sm">Avg Efficiency</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}


        {/* Daily Snapshots Table */}
        <Card className="shadow-sm border border-gray-200">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="font-semibold text-gray-900 text-xl">{getCostCenterName()} Daily Snapshots</CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Date:</label>
                  <Input
                    type="date"
                    value={dateInput}
                    onChange={handleDateChange}
                    className="h-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Sessions:</label>
                  <select
                    value={sessionFilter}
                    onChange={(e) => setSessionFilter(e.target.value as 'all' | 'completed' | 'ongoing')}
                    className="h-9 px-3 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">All Sites</option>
                    <option value="completed">Normal Sites</option>
                    <option value="ongoing">Irregular Sites</option>
                  </select>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchActivityData()} 
                  disabled={!selectedDate}
                >
                  <RefreshCw className="mr-2 w-4 h-4" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Session Filter Summary */}
            {siteRows.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-blue-900">
                      Showing {getFilteredSessions().length} of {siteRows.length} sites
                    </span>
                    {sessionFilter !== 'all' && (
                      <span className="text-xs text-blue-700">
                        ({sessionFilter === 'completed' ? 'Normal' : 'Irregular'} sites only)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-blue-700">
                    <span>Normal: {siteRows.filter(r => r.session_status === 'NORMAL').length}</span>
                    <span>•</span>
                    <span>Irregular: {siteRows.filter(r => r.session_status === 'IRREGULAR').length}</span>
                  </div>
                </div>
              </div>
            )}
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-center">
                  <div className="mx-auto mb-4 border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
                  <p className="text-gray-600">Loading snapshots...</p>
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
                      <th className="px-6 py-4 font-medium text-sm text-left">Branch</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Company</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Morning Fuel</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Midday Fuel</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Evening Fuel</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Total Usage</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Total Fill</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {getFilteredSessions().length > 0 ? (
                      getFilteredSessions().map((row) => (
                        <tr key={row.branch}>
                          <td className="px-6 py-4 font-medium text-gray-900 text-sm">{row.branch}</td>
                          <td className="px-6 py-4 text-gray-900 text-sm">{row.company}</td>
                          <td className="px-6 py-4 text-gray-900 text-sm">{row.opening_percentage.toFixed(1)}%</td>
                          <td className="px-6 py-4 text-gray-900 text-sm">{row.midday_percentage.toFixed(1)}%</td>
                          <td className="px-6 py-4 text-gray-900 text-sm">{row.closing_percentage.toFixed(1)}%</td>
                          <td className="px-6 py-4 text-gray-900 text-sm">{row.total_usage.toFixed(1)}L</td>
                          <td className="px-6 py-4 text-gray-900 text-sm">{row.total_fill.toFixed(1)}L</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <div className="text-gray-500">
                            <p className="text-lg">
                              {sessionFilter === 'all' ? 'No snapshots data' :
                               sessionFilter === 'completed' ? 'No normal sites found' :
                               'No irregular sites found'}
                            </p>
                            {sessionFilter !== 'all' && (
                              <p className="text-sm mt-2">
                                Try selecting "All Sites" to see all available data
                              </p>
                            )}
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

        {/* Vehicles Over 24 Hours (not provided by new activity report; keep hidden unless populated elsewhere) */}
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
                    {vehiclesOver24h.map(() => (
                      <tr key={0}></tr>
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
