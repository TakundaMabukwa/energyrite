'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';

import { RefreshCw, Calendar, Clock, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartCard } from '@/components/ui/chart-card';
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { useApp } from '@/contexts/AppContext';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import { getReportsApiUrl } from '@/lib/utils/api-url';

interface ActivityReportViewProps {
  onBack?: () => void;
  initialDate?: string;
}

interface SiteReport {
  generator: string;
  cost_code: string;
  company: string;
  branch: string;
  start_time?: string | null;
  end_time?: string | null;
  morning_to_afternoon_usage: number;
  afternoon_to_evening_usage: number;
  morning_to_evening_usage: number;
  peak_time_slot: string;
  peak_fuel_usage: number;
  total_fuel_usage: number;
  total_sessions: number;
  session_count: number;
  total_operating_hours: number;
  fuel_cost_per_liter?: number;
  estimated_fuel_cost?: number;
  period_breakdown: {
    morning_to_afternoon: number;
    afternoon_to_evening: number;
    full_day_total: number;
  };
}

interface ActivityReportData {
  period: {
    start_date: string;
    end_date: string;
  };
  total_sites: number;
  overall_peak_time_slot: string;
  overall_peak_usage: number;
  time_slot_totals: {
    morning_to_afternoon: number;
    afternoon_to_evening: number;
    morning_to_evening: number;
  };
  site_reports: SiteReport[];
  summary: {
    total_morning_to_afternoon_usage: number;
    total_afternoon_to_evening_usage: number;
    total_full_day_usage: number;
    period_comparison: {
      morning_period: number;
      afternoon_period: number;
      peak_period: string;
      peak_usage: number;
    };
    total_sessions: number;
    total_operating_hours: number;
  };
}

export function ActivityReportView({ onBack, initialDate }: ActivityReportViewProps) {
  const { selectedRoute } = useApp();
  const { userCostCode, userSiteId, isAdmin } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    return initialDate || new Date().toISOString().split('T')[0];
  });
  const [reportData, setReportData] = useState<ActivityReportData | null>(null);
  const [selectedCostCode, setSelectedCostCode] = useState('');
  const [generatingExcel, setGeneratingExcel] = useState(false);

  const getCostCenterName = () => {
    return 'Activity Reports';
  };

  const getBreadcrumbPath = () => {
    const dateObj = new Date(selectedDate);
    const formatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `Energyrite => Activity Reports - ${formatted}`;
  };

  // Convert decimal hours to readable format (e.g., 0.92 -> "55m", 2.22 -> "2h 13m")
  const formatHours = (decimalHours: number): string => {
    if (!decimalHours || decimalHours === 0) return "0m";
    
    const totalMinutes = Math.round(decimalHours * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours === 0) {
      return `${minutes}m`;
    } else if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  };

  // Format timestamp to readable period (e.g., "2025-11-07T12:30:42.621+00:00" -> "Afternoon")
  const formatPeakTime = (timestamp: string): string => {
    if (!timestamp) return "-";
    try {
      const date = new Date(timestamp);
      const hour = date.getHours();
      
      if (hour >= 0 && hour < 8) {
        return "Morning";
      } else if (hour >= 8 && hour < 16) {
        return "Afternoon";
      } else {
        return "Evening";
      }
    } catch (error) {
      return "-";
    }
  };

  const formatSiteTime = (timestamp?: string | null): string => {
    if (!timestamp) return '-';
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Fetch activity reports data
  const fetchActivityData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 Fetching activity reports data...');
      
      // Priority: site_id > selectedRoute.costCode > userCostCode
      const costCodeFilter = selectedRoute?.costCode || userCostCode || '';
      const siteIdFilter = userSiteId || null;
      
      // Fetch from activity reports endpoint
      const baseUrl = getReportsApiUrl('');
      const params = new URLSearchParams();
      params.append('date', selectedDate);
      if (siteIdFilter) {
        params.append('site_id', siteIdFilter);
        if (costCodeFilter) {
          params.append('cost_code', costCodeFilter);
        }
      } else if (costCodeFilter) {
        params.append('cost_code', costCodeFilter);
      }
      
      console.log('🔍 API call params:', params.toString(), 'costCodeFilter:', costCodeFilter);
      
      const reportsRes = await fetch(`${baseUrl}/api/energy-rite/reports/activity?${params.toString()}`);
      
      if (!reportsRes.ok) {
        throw new Error('Failed to fetch activity reports data');
      }
      
      const reportsData = await reportsRes.json();
      
      console.log('✅ Activity reports data received:', reportsData);
      console.log('🔍 API Data structure:', reportsData.data);
      console.log('🔍 Fuel analysis:', reportsData.data?.fuel_analysis);
      console.log('🔍 Sites data:', reportsData.data?.sites);
      
      if (reportsData.success && reportsData.data) {
        // Transform the API response to match expected structure
        const apiData = reportsData.data;
        
        // Check if sessions data exists (new structure)
        if (apiData.sessions && Array.isArray(apiData.sessions)) {
          console.log('🆕 Using sessions-based API structure');
          
          const allSessions = apiData.sessions as any[];
          const operatingSessions = allSessions.filter((session: any) =>
            session?.status === 'COMPLETED' || session?.status === 'ONGOING'
          );

          // Group operating sessions by branch to create site reports
          const sessionsByBranch = operatingSessions.reduce((acc: Record<string, any[]>, session: any) => {
            const branch = session.branch || 'Unknown';
            if (!acc[branch]) {
              acc[branch] = [];
            }
            acc[branch].push(session);
            return acc;
          }, {});

          // Group all sessions for site fill totals
          const allSessionsByBranch = allSessions.reduce((acc: Record<string, any[]>, session: any) => {
            const branch = session.branch || 'Unknown';
            if (!acc[branch]) {
              acc[branch] = [];
            }
            acc[branch].push(session);
            return acc;
          }, {});
          
          // Transform sessions into site reports
          const siteReports = Object.entries(sessionsByBranch).map(([branch, sessions]: [string, any[]]) => {
            const totalOperatingHours = sessions.reduce((sum, s) => sum + (s.duration_hours || 0), 0);
            const totalFuelUsage = sessions.reduce((sum, s) => sum + (s.fuel_usage || 0), 0);
            const branchSessionsAll = allSessionsByBranch[branch] || [];
            const totalFuelFilled = branchSessionsAll.reduce((sum, s) => sum + (s.fuel_filled || 0), 0);
            const totalSessions = sessions.length;
            const validStartTimes = sessions
              .map(s => s.start_time)
              .filter(Boolean)
              .map((t: string) => new Date(t).getTime())
              .filter((t: number) => !Number.isNaN(t));
            const validEndTimes = sessions
              .map(s => s.end_time)
              .filter(Boolean)
              .map((t: string) => new Date(t).getTime())
              .filter((t: number) => !Number.isNaN(t));
            
            // Find peak usage session
            const peakSession = sessions.reduce((max, s) => 
              (s.fuel_usage || 0) > (max.fuel_usage || 0) ? s : max
            , sessions[0]);
            
            return {
              branch,
              generator: branch,
              company: sessions[0]?.company || 'Unknown',
              cost_code: sessions[0]?.cost_code || '',
              start_time: validStartTimes.length > 0 ? new Date(Math.min(...validStartTimes)).toISOString() : null,
              end_time: validEndTimes.length > 0 ? new Date(Math.max(...validEndTimes)).toISOString() : null,
              total_operating_hours: totalOperatingHours,
              total_fuel_usage: totalFuelUsage,
              total_fuel_filled: totalFuelFilled,
              total_sessions: totalSessions,
              peak_usage_session: peakSession?.start_time || '',
              peak_fuel_usage: peakSession?.fuel_usage || 0,
              peak_time_slot: 'morning_to_afternoon',
              morning_to_afternoon_usage: totalFuelUsage,
              afternoon_to_evening_usage: 0
            };
          });
          
          const transformedData = {
            summary: {
              total_sites: siteReports.length,
              total_sessions: apiData.summary?.total_sessions || operatingSessions.length,
              total_operating_hours: apiData.summary?.total_operating_hours || 0,
              total_fuel_usage: apiData.summary?.total_fuel_usage || 0,
              total_fuel_filled: parseFloat(
                apiData?.fuel_analysis?.fuel_fills?.total_fuel_filled ||
                apiData?.summary?.total_fuel_filled_amount ||
                apiData?.summary?.total_fuel_filled ||
                0
              )
            },
            site_reports: siteReports,
            time_slot_totals: {
              morning_to_afternoon: parseFloat(apiData.fuel_analysis?.period_breakdown?.morning?.fuel_usage || 0),
              afternoon_to_evening: parseFloat(apiData.fuel_analysis?.period_breakdown?.afternoon?.fuel_usage || 0),
              morning_to_evening: parseFloat(apiData.summary?.total_fuel_usage || 0)
            }
          };
          setReportData(transformedData);
                } else if (apiData.fuel_analysis && apiData.sites) {
          console.log('Using sites-based API structure');
          const morningUsage = parseFloat(
            apiData?.fuel_analysis?.period_breakdown?.morning?.fuel_usage ??
            apiData?.fuel_analysis?.period_breakdown?.morning ??
            0
          );
          const afternoonUsage = parseFloat(
            apiData?.fuel_analysis?.period_breakdown?.afternoon?.fuel_usage ??
            apiData?.fuel_analysis?.period_breakdown?.afternoon ??
            0
          );
          const fullDayUsage = parseFloat(
            apiData?.fuel_analysis?.daily_total_consumption ??
            apiData?.summary?.total_fuel_usage ??
            0
          );

          const transformedData = {
            summary: apiData.summary,
            fuel_analysis: apiData.fuel_analysis,
            site_reports: (apiData.sites || []).map(site => ({
              ...site,
              generator: site.branch,
              morning_to_afternoon_usage: morningUsage,
              afternoon_to_evening_usage: afternoonUsage,
              peak_time_slot: apiData.fuel_analysis?.peak_usage_period?.period === 'morning' ? 'morning_to_afternoon' : 'afternoon_to_evening',
              peak_fuel_usage: site.peak_usage_amount || 0,
              total_fuel_usage: site.total_fuel_usage || 0,
              total_operating_hours: site.total_operating_hours || 0
            })),
            time_slot_totals: {
              morning_to_afternoon: morningUsage,
              afternoon_to_evening: afternoonUsage,
              morning_to_evening: fullDayUsage
            }
          };
          setReportData(transformedData);
        } else {
          console.log('⚠️ Using fallback/old API structure');
          // Fallback to old structure
          const transformedData = {
            ...apiData,
            site_reports: apiData.sites || [],
            time_slot_totals: {
              morning_to_afternoon: 0,
              afternoon_to_evening: 0, 
              morning_to_evening: 0
            }
          };
          setReportData(transformedData);
        }
      } else {
        // If site_id was used and no data found, show specific error
        if (siteIdFilter) {
          throw new Error(`No data found for site: ${siteIdFilter}`);
        }
        setReportData(null);
      }
      
    } catch (err) {
      console.error('❌ Error fetching activity data:', err);
      
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      toast({
        title: 'Failed to load activity data',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive'
      });
      
      setReportData(null);
    } finally {
      setLoading(false);
      if (!error) {
        toast({
          title: 'Activity data loaded',
          description: 'Latest reports fetched successfully.'
        });
      }
    }
  }, [toast, isAdmin, selectedRoute, userCostCode, selectedDate]);

  useEffect(() => {
    fetchActivityData();
  }, [fetchActivityData]);

  // Generate Activity Excel Report
  const generateActivityExcelReport = async () => {
    try {
      setGeneratingExcel(true);
      
      const costCode = selectedRoute?.costCode || userCostCode || null;
      const siteId = userSiteId || null;
      
      const requestBody = {
        report_type: 'daily',
        start_date: selectedDate,
        end_date: selectedDate,
        ...(siteId && { site_id: siteId }),
        ...(costCode && !siteId && { cost_code: costCode })
      };
      
      const apiUrl = getReportsApiUrl('/api/energy-rite/excel-reports/generate');
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate report: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success || !data.data?.download_url) {
        throw new Error(data.message || 'Failed to generate Excel report');
      }
      
      window.open(data.data.download_url, '_blank');
      
      toast({
        title: 'Daily Excel Report Ready',
        description: `File: ${data.data.file_name} - Click to download`
      });
    } catch (error) {
      console.error('❌ Error generating Excel report:', error);
      toast({
        title: 'Failed to generate Excel report',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setGeneratingExcel(false);
    }
  };

  const getTimeSlotCards = () => {
    if (!reportData || !reportData.time_slot_totals) return [];
    
    const { time_slot_totals } = reportData;
    
    return [
      {
        title: 'Morning Period',
        timeRange: '6AM - 12PM Usage',
        totalFuel: time_slot_totals.morning_to_afternoon,
        isOverallPeak: reportData.overall_peak_time_slot === 'morning_to_afternoon'
      },
      {
        title: 'Afternoon Period', 
        timeRange: '12PM - 6PM Usage',
        totalFuel: time_slot_totals.afternoon_to_evening,
        isOverallPeak: reportData.overall_peak_time_slot === 'afternoon_to_evening'
      }
    ];
  };

  if (loading) {
    return (
      <div className="flex justify-start items-start bg-white min-h-screen p-6">
        <div className="text-left">
          <div className="mb-4 border-b-2 border-blue-600 rounded-full w-12 h-12 animate-spin"></div>
          <p className="text-gray-600">Loading activity reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-start items-start bg-white min-h-screen p-6">
        <div className="text-left">
          <div className="mb-4 text-gray-400 text-6xl">📊</div>
          <p className="mb-4 font-medium text-gray-600 text-lg">No Data Available</p>
          <p className="mb-4 text-gray-500 text-sm">Unable to load activity data at this time</p>
          <Button onClick={fetchActivityData} variant="outline">
            <RefreshCw className="mr-2 w-4 h-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const timeSlotCards = getTimeSlotCards();

  // Use API summary data when available, fallback to calculated totals
  const totalFuelUsage = reportData?.summary?.total_fuel_usage ?? 
    (reportData?.site_reports?.reduce((sum, s) => sum + (s.total_fuel_usage || 0), 0) ?? 0);
  const totalOperatingHours = reportData?.summary?.total_operating_hours ?? 
    (reportData?.site_reports?.reduce((sum, s) => sum + (s.total_operating_hours || 0), 0) ?? 0);
  const totalFuelFilled = reportData?.summary?.total_fuel_filled ?? 
    (reportData?.site_reports?.reduce((sum, s) => sum + (s.total_fuel_filled || 0), 0) ?? 0);
  const totalSessions = reportData?.summary?.total_sessions ?? 
    (reportData?.site_reports?.reduce((sum, s) => sum + (s.total_sessions || 0), 0) ?? 0);
  const totalSites = reportData?.summary?.total_sites ?? 
    (reportData?.site_reports?.length ?? 0);
  const avgOperatingHours = totalSites > 0 ? (totalOperatingHours / totalSites) : 0;

  return (
    <div className="bg-white min-h-screen">

      {/* Main Content */}
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="bg-white shadow-sm border-b px-6 py-6">
          <div className="max-w-7xl mx-auto">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">{getCostCenterName()}</h1>
              <p className="text-gray-600">{getBreadcrumbPath()}</p>
            </div>
          </div>
        </div>

        {/* Summary Cards: Operating Hours, Fuel Usage, Fuel Fills */}
        {reportData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {/* Total Operating Hours */}
            <Card className="rounded-lg shadow-sm border-0 overflow-hidden">
              <div className="h-1 bg-sky-600" />
              <CardContent className="p-4">
                <div className="flex flex-col items-start">
                  <div className="text-3xl font-extrabold text-sky-700">{formatHours(totalOperatingHours || 0)}</div>
                  <div className="text-sm text-gray-500 mt-1">Total operating hours</div>
                  <div className="text-xs text-gray-400 mt-2">For the day</div>
                </div>
              </CardContent>
            </Card>

            {/* Total Fuel Usage */}
            <Card className="rounded-lg shadow-sm border-0 overflow-hidden">
              <div className="h-1 bg-blue-500" />
              <CardContent className="p-4">
                <div className="flex flex-col items-start">
                  <div className="text-3xl font-extrabold text-blue-700">{(totalFuelUsage || 0).toFixed(1)}L</div>
                  <div className="text-sm text-gray-500 mt-1">Total fuel usage</div>
                  <div className="text-xs text-gray-400 mt-2">For the day</div>
                </div>
              </CardContent>
            </Card>

            {/* Total Fuel Fills */}
            <Card className="rounded-lg shadow-sm border-0 overflow-hidden">
              <div className="h-1 bg-green-500" />
              <CardContent className="p-4">
                <div className="flex flex-col items-start">
                  <div className="text-3xl font-extrabold text-green-700">{(totalFuelFilled || 0).toFixed(1)}L</div>
                  <div className="text-sm text-gray-500 mt-1">Total fills</div>
                  <div className="text-xs text-gray-400 mt-2">For the day</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        

        {/* Site Reports Table */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-900 text-xl">ALL SITES ({reportData?.site_reports?.length || 0})</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <Button onClick={fetchActivityData} size="sm">
                <RefreshCw className="mr-2 w-4 h-4" />
                Update
              </Button>
              <Button 
                onClick={generateActivityExcelReport} 
                size="sm" 
                variant="outline"
                disabled={generatingExcel}
              >
                <Download className="mr-2 w-4 h-4" />
                {generatingExcel ? 'Generating...' : 'Excel Report'}
              </Button>
            </div>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
            <TableHead className="font-medium">Site</TableHead>
            <TableHead className="font-medium">Start Time</TableHead>
            <TableHead className="font-medium">End Time</TableHead>
            <TableHead className="font-medium">Operating Hours</TableHead>
            <TableHead className="font-medium">Fuel Usage</TableHead>
            <TableHead className="font-medium">Fuel Fills</TableHead>
            <TableHead className="font-medium">Peak Usage Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData?.site_reports && reportData.site_reports.length > 0 ? (
                  reportData.site_reports
                    .filter(site => !selectedCostCode || site.cost_code === selectedCostCode)
                    .filter(site => site.total_operating_hours > 0)
                    .sort((a, b) => (a.branch || a.generator || '').localeCompare(b.branch || b.generator || ''))
                    .map((site, index) => {
                      const peakPeriodName = site.peak_time_slot === 'morning_to_afternoon' ? 'Morning' : 'Afternoon';
                      const estimatedCost = (site.total_fuel_usage || 0) * 21.50;

                      return (
                        <TableRow key={index} className="h-12">
                          <TableCell className="font-medium py-2">
                            <div>
                              <div className="font-medium">{site.branch || site.generator}</div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            <span className="font-medium text-gray-700">{formatSiteTime(site.start_time)}</span>
                          </TableCell>
                          <TableCell className="py-2">
                            <span className="font-medium text-gray-700">{site.end_time ? formatSiteTime(site.end_time) : 'Ongoing'}</span>
                          </TableCell>
                          <TableCell className="py-2">
                            <span className="font-medium text-sky-700">{formatHours(site.total_operating_hours || 0)}</span>
                          </TableCell>
                          <TableCell className="py-2">
                            <span className="font-medium text-blue-600">{(site.total_fuel_usage || 0).toFixed(1)}L</span>
                          </TableCell>
                          <TableCell className="font-medium py-2">
                            <span className="text-green-600">{(site.total_fuel_filled || 0).toFixed(1)}L</span>
                          </TableCell>
                          <TableCell className="py-2">
                            <span className="font-medium text-orange-600">{formatPeakTime(site.peak_usage_session)}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No activity data available for the selected date range
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}

