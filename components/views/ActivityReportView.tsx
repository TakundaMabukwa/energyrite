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
  average_efficiency?: number;
}

interface SiteDayRow {
  id: number;
  branch: string;
  company: string;
  cost_code: string;
  session_date: string;
  session_start_time: string;
  session_end_time: string | null;
  operating_hours: number;
  opening_percentage: number;
  opening_fuel: number;
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
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [useDateRange, setUseDateRange] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);
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
    try {
      setLoading(true);
      setError(null);
      
      // Build URL for engine sessions endpoint
      const params = new URLSearchParams();
      
      if (useDateRange && startDate && endDate) {
        params.append('start_date', startDate);
        params.append('end_date', endDate);
      } else {
        const targetDate = (forDate || selectedDate || '').toString();
        if (targetDate) params.append('date', targetDate);
      }
      
      // Only add cost_code filter if user is not admin
      if (!isAdmin && userCostCode) {
        params.append('cost_code', userCostCode);
      }
      const sessionsUrl = `http://${process.env.NEXT_PUBLIC_SERVER_URL}/api/energy-rite/reports/engine-sessions${params.toString() ? `?${params.toString()}` : ''}`;
      const sessionsResponse = await fetch(sessionsUrl);
      
      if (sessionsResponse.ok) {
        const sessionsResult = await sessionsResponse.json();
        if (sessionsResult.success) {
          const data = sessionsResult.data || {};
          const summary = data.summary || {};
          
          // Set activity statistics from operating sessions summary
          setActivityStats({
            total_sessions: Number(summary.total_sessions || 0),
            completed_sessions: Number(summary.completed_sessions || 0),
            ongoing_sessions: Number(summary.ongoing_sessions || 0),
            total_operating_hours: Number(summary.total_operating_hours || 0),
            total_fuel_usage: Number(summary.total_fuel_usage || 0),
            average_efficiency: Number(summary.average_efficiency || 0),
          });

          // Map sessions to rows for table display
          const sessions: any[] = Array.isArray(data.sessions) ? data.sessions : [];
          const rows: SiteDayRow[] = sessions.map((session: any, idx: number) => ({
            id: session.id || idx + 1,
            branch: session.branch || '',
            company: session.company || '',
            cost_code: session.cost_code || '',
            session_date: session.session_date || '',
            session_start_time: session.session_start_time || '',
            session_end_time: session.session_end_time || null,
            operating_hours: Number(session.operating_hours || 0),
            opening_percentage: Number(session.opening_percentage || 0),
            opening_fuel: Number(session.opening_fuel || 0),
            closing_percentage: Number(session.closing_percentage || 0),
            closing_fuel: Number(session.closing_fuel || 0),
            total_usage: Number(session.total_usage || 0),
            total_fill: Number(session.total_fill || 0),
            liter_usage_per_hour: Number(session.liter_usage_per_hour || 0),
            cost_for_usage: Number(session.cost_for_usage || 0),
            session_status: session.session_status || '',
          }));
          
          setSiteRows(rows);
        }
      }
    } catch (err) {
      console.error('Error fetching engine sessions data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch engine sessions data');
      toast({
        title: 'Failed to load engine sessions',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      if (!error && (selectedDate || (startDate && endDate))) {
        const dateDescription = useDateRange 
          ? `Engine sessions from ${startDate} to ${endDate} fetched successfully.`
          : `Engine sessions for ${selectedDate} fetched successfully.`;
        toast({
          title: 'Engine sessions loaded',
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
        {/* Engine Sessions Statistics Cards */}
        {activityStats && (
          <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Activity className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="font-bold text-gray-900 text-2xl">{activityStats.total_sessions ?? 0}</p>
                    <p className="text-gray-600 text-sm">Total Sessions</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="font-bold text-gray-900 text-2xl">{activityStats.total_operating_hours?.toFixed(1) ?? '0.0'}</p>
                    <p className="text-gray-600 text-sm">Operating Hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-purple-500" />
                  <div>
                    <p className="font-bold text-gray-900 text-2xl">{activityStats.total_fuel_usage?.toFixed(1) ?? '0.0'}</p>
                    <p className="text-gray-600 text-sm">Fuel Used (L)</p>
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

        {/* Engine Sessions Table */}
        <Card className="shadow-sm border border-gray-200">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="font-semibold text-gray-900 text-xl">{getCostCenterName()} Engine Sessions</CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Single Date:</label>
                  <Input
                    type="date"
                    value={dateInput}
                    onChange={handleDateChange}
                    className="h-9"
                    disabled={useDateRange}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Date Range:</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9"
                    disabled={!useDateRange}
                    placeholder="Start Date"
                  />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9"
                    disabled={!useDateRange}
                    placeholder="End Date"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Mode:</label>
                  <select
                    value={useDateRange ? 'range' : 'single'}
                    onChange={(e) => setUseDateRange(e.target.value === 'range')}
                    className="h-9 px-3 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="single">Single Date</option>
                    <option value="range">Date Range</option>
                  </select>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchActivityData()} 
                  disabled={
                    useDateRange ? (!startDate || !endDate) : !selectedDate
                  }
                >
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
                  <p className="text-gray-600">Loading engine sessions...</p>
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
                      <th className="px-6 py-4 font-medium text-sm text-left">Start Time</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">End Time</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Duration (hrs)</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Opening Fuel</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Closing Fuel</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Usage (L)</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Efficiency</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {siteRows.length > 0 ? (
                      siteRows.map((row) => (
                        <tr key={row.id}>
                          <td className="px-6 py-4 font-medium text-gray-900 text-sm">{row.branch}</td>
                          <td className="px-6 py-4 text-gray-900 text-sm">{row.company}</td>
                          <td className="px-6 py-4 text-gray-900 text-sm">{row.session_start_time ? formatForDisplay(row.session_start_time) : '-'}</td>
                          <td className="px-6 py-4 text-gray-900 text-sm">{row.session_end_time ? formatForDisplay(row.session_end_time) : 'Ongoing'}</td>
                          <td className="px-6 py-4 text-gray-900 text-sm">{row.operating_hours.toFixed(1)}</td>
                          <td className="px-6 py-4 text-gray-900 text-sm">{row.opening_fuel.toFixed(1)}L ({row.opening_percentage.toFixed(1)}%)</td>
                          <td className="px-6 py-4 text-gray-900 text-sm">{row.closing_fuel.toFixed(1)}L ({row.closing_percentage.toFixed(1)}%)</td>
                          <td className="px-6 py-4 text-gray-900 text-sm">{row.total_usage.toFixed(1)}L</td>
                          <td className="px-6 py-4 text-gray-900 text-sm">{row.liter_usage_per_hour.toFixed(2)} L/hr</td>
                          <td className="px-6 py-4 text-gray-900 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              row.session_status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                              row.session_status === 'ONGOING' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {row.session_status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="px-6 py-12 text-center">
                          <div className="text-gray-500">
                            <p className="text-lg">No engine sessions data</p>
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
