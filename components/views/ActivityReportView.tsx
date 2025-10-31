'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { TopNavigation } from '@/components/layout/TopNavigation';
import { RefreshCw, Calendar, Clock, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartCard } from '@/components/ui/chart-card';
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { useApp } from '@/contexts/AppContext';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';

interface ActivityReportViewProps {
  onBack?: () => void;
}

interface SiteReport {
  generator: string;
  cost_code: string;
  company: string;
  branch: string;
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

export function ActivityReportView({ onBack }: ActivityReportViewProps) {
  const { selectedRoute } = useApp();
  const { userCostCode, userSiteId, isAdmin } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
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
      const baseUrl = `http://${process.env.NEXT_PUBLIC_API_HOST}:${process.env.NEXT_PUBLIC_API_PORT}`;
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
        
        // Check if new API structure exists
        if (apiData.fuel_analysis && apiData.sites) {
          console.log('🆕 Using new API structure');
          const transformedData = {
            summary: apiData.summary,
            fuel_analysis: apiData.fuel_analysis,
            site_reports: (apiData.sites || []).map(site => ({
              ...site,
              generator: site.branch,
              morning_to_afternoon_usage: parseFloat(apiData.fuel_analysis?.period_breakdown?.morning || 0),
              afternoon_to_evening_usage: parseFloat(apiData.fuel_analysis?.period_breakdown?.afternoon || 0),
              peak_time_slot: apiData.fuel_analysis?.peak_usage_period?.period === 'morning' ? 'morning_to_afternoon' : 'afternoon_to_evening',
              peak_fuel_usage: site.peak_usage_amount || 0,
              total_fuel_usage: site.total_fuel_usage || 0,
              total_operating_hours: site.total_operating_hours || 0
            })),
            time_slot_totals: {
              morning_to_afternoon: parseFloat(apiData.fuel_analysis?.period_breakdown?.morning || 0),
              afternoon_to_evening: parseFloat(apiData.fuel_analysis?.period_breakdown?.afternoon || 0),
              morning_to_evening: parseFloat(apiData.fuel_analysis?.daily_total_consumption || 0)
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
      
      const costCodeFilter = selectedRoute?.costCode || userCostCode || '';
      const siteIdFilter = userSiteId || null;
      const params = new URLSearchParams();
      if (siteIdFilter) {
        params.append('site_id', siteIdFilter);
      } else if (costCodeFilter) {
        params.append('costCode', costCodeFilter);
      }
      if (selectedDate) params.append('date', selectedDate);
      
      const response = await fetch(`http://${process.env.NEXT_PUBLIC_API_HOST}:${process.env.NEXT_PUBLIC_API_PORT}/api/energy-rite/activity-excel-reports/generate?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        window.open(result.data.download_url, '_blank');
        toast({
          title: 'Excel Report Generated',
          description: `Activity report for ${result.data.total_sites} sites downloaded successfully.`
        });
      } else {
        throw new Error(result.message || 'Failed to generate report');
      }
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
      <div className="flex justify-center items-center bg-gray-50 h-full">
        <div className="text-center">
          <div className="mx-auto mb-4 border-b-2 border-blue-600 rounded-full w-12 h-12 animate-spin"></div>
          <p className="text-gray-600">Loading activity reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center bg-gray-50 h-full">
        <div className="text-center">
          <div className="mx-auto mb-4 text-gray-400 text-6xl">📊</div>
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

  return (
    <div className="bg-gray-50 h-full">
      <TopNavigation />

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

        {/* Time Period Analysis Summary */}
        {reportData?.site_reports && (
          <div className="gap-4 grid grid-cols-1 md:grid-cols-3 mb-6">
            {(() => {
              const sitesWithUsage = reportData.site_reports.filter(site => site.total_fuel_usage > 0);
              
              // Calculate totals from actual site data
              let totalMorning = 0;
              let totalAfternoon = 0;
              let morningPeakCount = 0;
              let afternoonPeakCount = 0;
              
              sitesWithUsage.forEach(site => {
                totalMorning += parseFloat(site.morning_to_afternoon_usage || '0') || 0;
                totalAfternoon += parseFloat(site.afternoon_to_evening_usage || '0') || 0;
                
                if (site.peak_time_slot === 'morning_to_afternoon') {
                  morningPeakCount++;
                } else {
                  afternoonPeakCount++;
                }
              });
              
              const peakPeriod = morningPeakCount > afternoonPeakCount ? 'Morning' : 'Afternoon';
              const peakUsage = Math.max(totalMorning, totalAfternoon);
              
              return (
                <>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{(totalMorning || 0).toFixed(1)}L</div>
                        <div className="text-sm text-gray-600">Morning Period (6AM-12PM)</div>
                        <div className="text-xs text-gray-500 mt-1">Peak usage identification</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{(totalAfternoon || 0).toFixed(1)}L</div>
                        <div className="text-sm text-gray-600">Afternoon Period (12PM-6PM)</div>
                        <div className="text-xs text-gray-500 mt-1">Peak usage identification</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{peakPeriod}</div>
                        <div className="text-sm text-gray-600">Peak Period</div>
                        <div className="text-xs text-gray-500 mt-1">{morningPeakCount > afternoonPeakCount ? morningPeakCount : afternoonPeakCount} sites peak</div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              );
            })()} 
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
                  <TableHead className="font-medium text-center">Morning (6AM-12PM)</TableHead>
                  <TableHead className="font-medium text-center">Afternoon (12PM-6PM)</TableHead>
                  <TableHead className="font-medium text-center">Peak Period</TableHead>
                  <TableHead className="font-medium text-right">Peak Usage</TableHead>
                  <TableHead className="font-medium text-right">Total Usage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData?.site_reports && reportData.site_reports.length > 0 ? (
                  reportData.site_reports
                    .filter(site => !selectedCostCode || site.cost_code === selectedCostCode)
                    .map((site, index) => {
                      const peakPeriodName = site.peak_time_slot === 'morning_to_afternoon' ? 'Morning' : 'Afternoon';
                      const peakPeriodTime = site.peak_time_slot === 'morning_to_afternoon' ? '6AM-12PM' : '12PM-6PM';
                      const estimatedCost = (site.total_fuel_usage || 0) * 21.50;
                      
                      return (
                        <TableRow key={index} className="h-12">
                          <TableCell className="font-medium py-2">
                            <div>
                              <div className="font-medium">{site.branch || site.generator}</div>
                              <div className="text-xs text-gray-500">{site.cost_code}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center py-2">
                            <span className="font-medium text-blue-600">{(site.morning_to_afternoon_usage || 0).toFixed(1)}L</span>
                          </TableCell>
                          <TableCell className="text-center py-2">
                            <span className="font-medium text-orange-600">{(site.afternoon_to_evening_usage || 0).toFixed(1)}L</span>
                          </TableCell>
                          <TableCell className="text-center py-2">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              site.peak_time_slot === 'morning_to_afternoon' ? 'bg-blue-100 text-blue-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {peakPeriodName}
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <span className="font-medium text-red-600">{(site.peak_fuel_usage || 0).toFixed(1)}L</span>
                          </TableCell>
                          <TableCell className="text-right font-medium py-2">
                            <span className="text-gray-900">{(site.total_fuel_usage || 0).toFixed(1)}L</span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
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