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
  // Summary fields from /reports/activity-report (new schema)
  total_sites?: number;
  morning_snapshots?: number;
  midday_snapshots?: number;
  evening_snapshots?: number;
  avg_morning_fuel?: number;
  avg_evening_fuel?: number;
  irregularities_count?: number;
}

interface SiteDayRow {
  id: number;
  branch: string;
  company: string;
  cost_code: string;
  fuel_level_morning: number | null;
  fuel_level_midday: number | null;
  fuel_level_evening: number | null;
  engine_status_morning: string | null;
  engine_status_midday: string | null;
  engine_status_evening: string | null;
  total_fuel_used: number;
  total_fuel_filled: number;
  irregularities_count: number;
  first_snapshot: string | null;
  last_snapshot: string | null;
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
  const [siteRows, setSiteRows] = useState<SiteDayRow[]>([]);
  const [vehiclesOver24h, setVehiclesOver24h] = useState<never[]>([]);

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

  // Fetch activity data from Energy Rite server (new schema)
  const fetchActivityData = async (forDate?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Build proxy URL: keep query params separate from endpoint to avoid double '?'
      const targetDate = (forDate || selectedDate || '').toString();
      const params = new URLSearchParams();
      if (targetDate) params.append('date', targetDate);
      if (selectedRoute && 'costCode' in selectedRoute && selectedRoute.costCode) {
        params.append('cost_code', selectedRoute.costCode);
      }
      const statsUrl = `/api/energy-rite-proxy?endpoint=/api/energy-rite/reports/activity-report${params.toString() ? `&${params.toString()}` : ''}`;
      const statsResponse = await fetch(statsUrl);
      if (statsResponse.ok) {
        const statsResult = await statsResponse.json();
        if (statsResult.success) {
          const data = statsResult.data || {};
          const summary = data.summary || {};
          setActivityStats({
            total_sites: Number(summary.total_sites || 0),
            morning_snapshots: Number(summary.morning_snapshots || 0),
            midday_snapshots: Number(summary.midday_snapshots || 0),
            evening_snapshots: Number(summary.evening_snapshots || 0),
            avg_morning_fuel: Number(parseFloat(summary.avg_morning_fuel || '0') || 0),
            avg_evening_fuel: Number(parseFloat(summary.avg_evening_fuel || '0') || 0),
            irregularities_count: Number(summary.irregularities_count || 0),
          });

          // Map sites to rows for table display
          const sites: any[] = Array.isArray(data.sites) ? data.sites : [];
          const rows: SiteDayRow[] = sites.map((s: any, idx: number) => ({
            id: idx + 1,
            branch: s.branch,
            company: s.company,
            cost_code: s.cost_code || '',
            fuel_level_morning: typeof s.fuel_level_morning === 'number' ? s.fuel_level_morning : null,
            fuel_level_midday: typeof s.fuel_level_midday === 'number' ? s.fuel_level_midday : null,
            fuel_level_evening: typeof s.fuel_level_evening === 'number' ? s.fuel_level_evening : null,
            engine_status_morning: s.engine_status_morning || null,
            engine_status_midday: s.engine_status_midday || null,
            engine_status_evening: s.engine_status_evening || null,
            total_fuel_used: Number(s.total_fuel_used || 0),
            total_fuel_filled: Number(s.total_fuel_filled || 0),
            irregularities_count: Number(s.irregularities_count || 0),
            first_snapshot: s.first_snapshot || null,
            last_snapshot: s.last_snapshot || null,
          }));
          setSiteRows(rows);
        }
      }
      // No additional endpoints; the report returns pre-generated daily data
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
    setSiteRows([]);
    setVehiclesOver24h([] as never[]);
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
        {/* Activity Statistics Cards (new schema) */}
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
                    <p className="font-bold text-gray-900 text-2xl">{activityStats.avg_morning_fuel?.toFixed(2) ?? '0.00'}</p>
                    <p className="text-gray-600 text-sm">Avg Morning Fuel</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-purple-500" />
                  <div>
                    <p className="font-bold text-gray-900 text-2xl">{activityStats.avg_evening_fuel?.toFixed(2) ?? '0.00'}</p>
                    <p className="text-gray-600 text-sm">Avg Evening Fuel</p>
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

        {/* Daily Snapshots Table */}
        <Card className="shadow-sm border border-gray-200">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="font-semibold text-gray-900 text-xl">{getCostCenterName()} Daily Snapshots</CardTitle>
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
                      <th className="px-6 py-4 font-medium text-sm text-left">Cost Code</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Branch</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Company</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Fuel Morning</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Fuel Midday</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Fuel Evening</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Engine Morning</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Start Time</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">End Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {siteRows.length > 0 ? (
                      siteRows.map((row) => (
                        <tr key={row.id}>
                          <td className="px-6 py-4 font-medium text-gray-900 text-sm">{row.cost_code}</td>
                          <td className="px-6 py-4 text-gray-900 text-sm">{row.branch}</td>
                          <td className="px-6 py-4 text-gray-900 text-sm">{row.company}</td>
                          <td className="px-6 py-4 text-gray-900 text-sm">{row.fuel_level_morning ?? '-'}</td>
                          <td className="px-6 py-4 text-gray-900 text-sm">{row.fuel_level_midday ?? '-'}</td>
                          <td className="px-6 py-4 text-gray-900 text-sm">{row.fuel_level_evening ?? '-'}</td>
                          <td className="px-6 py-4 text-gray-900 text-sm">{row.engine_status_morning ?? '-'}</td>
                          <td className="px-6 py-4 text-gray-900 text-sm">{row.first_snapshot ? new Date(row.first_snapshot).toLocaleString() : '-'}</td>
                          <td className="px-6 py-4 text-gray-900 text-sm">{row.last_snapshot ? new Date(row.last_snapshot).toLocaleString() : '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center">
                          <div className="text-gray-500">
                            <p className="text-lg">No snapshot data</p>
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
