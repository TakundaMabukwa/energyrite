'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';

import { RefreshCw } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useUser } from '@/contexts/UserContext';
import { ScoreCard } from '@/components/ui/score-card';
import { ChartCard } from '@/components/ui/chart-card';
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { useToast } from '@/hooks/use-toast';
import { formatForDisplay } from '@/lib/utils/date-formatter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getReportsApiUrl } from '@/lib/utils/api-url';

interface ExecutiveDashboardViewProps {
  onBack?: () => void;
}

interface ScoreCardData {
  value: string | number;
  label: string;
  barColor: string;
  backgroundColor?: string;
}

interface ChartData {
  label: string;
  value: number;
  color: string;
}

interface ExecutiveDashboardData {
  summary?: {
    totalVehicles?: number;
    totalVolume?: number;
    vehiclesWithTheft?: number;
    vehiclesWithFuelData?: number;
    companies?: number;
    branches?: number;
  };
  theftMetrics?: {
    totalTheftIncidents?: number;
    recentThefts?: number;
    theftRate?: number;
  };
  companyBreakdown?: Record<string, {
    vehicleCount?: number;
    totalVolume?: number;
    theftIncidents?: number;
  }>;
  branchBreakdown?: Record<string, {
    vehicleCount?: number;
    totalVolume?: number;
    theftIncidents?: number;
  }>;
}

export function ExecutiveDashboardView({ onBack }: ExecutiveDashboardViewProps) {
  const { selectedRoute } = useApp();
  const { userCostCode, userSiteId, isAdmin } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scoreCardData, setScoreCardData] = useState<ScoreCardData[]>([]);
  const [topSitesData, setTopSitesData] = useState<ChartData[]>([]);
  const [activityData, setActivityData] = useState<ChartData[]>([]);
  const [longRunningData, setLongRunningData] = useState<ChartData[]>([]);
  const [dashboardData, setDashboardData] = useState<ExecutiveDashboardData | null>(null);
  const [activityReportData, setActivityReportData] = useState<any>(null);
  const [snapshotData, setSnapshotData] = useState<any>(null);
  const [periodFuelUsageData, setPeriodFuelUsageData] = useState<ChartData[]>([]);
  const [morningAfternoonData, setMorningAfternoonData] = useState<ChartData[]>([]);
  const [siteUsageData, setSiteUsageData] = useState<ChartData[]>([]);
  const [selectedCostCode, setSelectedCostCode] = useState('');

  const getCostCenterDisplayName = (costCode: string) => {
    const costCenterNames: Record<string, string> = {
      'KFC-0001-0001-0002-0004': 'KFC Main Branch',
      'KFC-0001-0001-0003': 'KFC Secondary Branch'
    };
    return costCenterNames[costCode] || costCode;
  };

  const getDashboardTitle = () => {
    const now = new Date();
    const monthName = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    return `Executive Dashboard (${monthName} - Month to Date)`;
  };

  const getBreadcrumbPath = () => {
    const now = new Date();
    const monthName = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    return `Energyrite => Executive Dashboard - ${monthName} (MTD)`;
  };

  // Fetch data from new monitoring endpoints
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 Fetching monitoring dashboard data...');
      
      // Priority: site_id > selectedRoute.costCode > userCostCode
      const costCodeFilter = selectedRoute?.costCode || userCostCode || '';
      const siteIdFilter = userSiteId || null;
      console.log('🔍 Final costCodeFilter result:', costCodeFilter);
      console.log('🔍 Site ID filter:', siteIdFilter);
      console.log('🔍 Cost code filter being used:', costCodeFilter);
      console.log('🔍 isAdmin:', isAdmin, 'selectedCostCode:', selectedCostCode);
      console.log('🔍 selectedRoute:', selectedRoute);
      console.log('🔍 userCostCode:', userCostCode);
      
      // Month-to-date: 1st of current month to yesterday
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const startDateString = startDate.toISOString().split('T')[0];
      const endDateString = yesterday.toISOString().split('T')[0];
      
      console.log('🔍 Month-to-date range:', startDateString, 'to', endDateString, '(yesterday)');
      
      // Fetch from new executive dashboard endpoint
      const baseUrl = getReportsApiUrl('');
      const params = new URLSearchParams();
      // Build enhanced dashboard parameters
      const enhancedParams = new URLSearchParams();
      enhancedParams.append('start_date', startDateString);
      enhancedParams.append('end_date', endDateString);
      if (costCodeFilter) {
        enhancedParams.append('cost_code', costCodeFilter);
      }
      const enhancedQueryString = enhancedParams.toString() ? `?${enhancedParams.toString()}` : '';
      
      console.log('🔍 Enhanced API URL:', `${baseUrl}/api/energy-rite/enhanced-executive-dashboard${enhancedQueryString}`);
      
      const dashboardRes = await fetch(`${baseUrl}/api/energy-rite/enhanced-executive-dashboard${enhancedQueryString}`);
      
      if (!dashboardRes.ok) {
        throw new Error('Failed to fetch executive dashboard data');
      }
      
      const dashboardData = await dashboardRes.json();
      
      console.log('✅ Executive dashboard data received:', dashboardData);
      const enhancedData = dashboardData.data;
      setDashboardData(enhancedData);
      
      // Update score cards using enhanced executive dashboard data
      console.log('Enhanced data for score cards:', enhancedData);
      
      // Extract and store fuel tracking data for potential fallback use
      if (enhancedData?.fuel_tracking) {
        const fallbackMorning = parseFloat(enhancedData.fuel_tracking.morning_usage) || 0;
        const fallbackAfternoon = parseFloat(enhancedData.fuel_tracking.afternoon_usage) || 0;
        const fallbackEvening = parseFloat(enhancedData.fuel_tracking.evening_usage) || 0;
        console.log('📊 Extracted fuel tracking from enhanced dashboard:', { fallbackMorning, fallbackAfternoon, fallbackEvening });
        
        // If cumulative API fails, we can use this as fallback
        if (fallbackMorning > 0 || fallbackAfternoon > 0 || fallbackEvening > 0) {
          setPeriodFuelUsageData([
            { label: 'Morning (7AM-12PM)', value: fallbackMorning, color: '#10B981' },
            { label: 'Afternoon (12PM-5PM)', value: fallbackAfternoon, color: '#A0A0A0' },
            { label: 'Evening (5PM-12AM)', value: fallbackEvening, color: '#87CEEB' }
          ]);
        }
      }
      
      // Extract key metrics from enhanced endpoint
      const totalSites = enhancedData?.key_metrics?.total_sites_operated || 0;
      const totalFuelUsage = enhancedData?.key_metrics?.total_litres_used || 0;
      const totalFuelFilled = enhancedData?.key_metrics?.total_litres_filled || 0;
      const opHours = enhancedData?.key_metrics?.total_operational_hours || 0;
      const fleetUtilization = enhancedData?.fleet_status?.fleet_utilization_percentage || 0;
      
      setScoreCardData([
        {
          value: totalSites,
          label: 'Total Sites',
          barColor: 'bg-blue-500'
        },
        {
          value: `${Number(totalFuelUsage).toFixed(1)}L`,
          label: 'Litres Used',
          barColor: 'bg-green-500'
        },
        {
          value: `${Number(totalFuelFilled).toFixed(1)}L`,
          label: 'Litres Filled',
          barColor: 'bg-cyan-500'
        },
        {
          value: `${Number(opHours).toFixed(1)}h`,
          label: 'Total Op Hours',
          barColor: 'bg-orange-500'
        }
      ]);

      // Update top sites data from enhanced executive dashboard
      if (enhancedData?.top_performing_sites?.length > 0) {
        const topSites = enhancedData.top_performing_sites
          .map((site: any, index: number) => ({
            label: (site.site || `Site ${index + 1}`).length > 15 
              ? (site.site || `Site ${index + 1}`).substring(0, 15) + '...' 
              : site.site || `Site ${index + 1}`,
            value: Math.max(0, Math.round(site.fuel_usage || 0)),
            color: ['#10B981', '#D97706', '#3B82F6', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F59E0B', '#EC4899', '#F97316'][index % 10]
          }))
          .filter(site => site.value > 0)
          .sort((a, b) => b.value - a.value)
          .slice(0, 10);
        
        setTopSitesData(topSites);
      } else {
        setTopSitesData([]);
      }

      // Update activity data using enhanced executive dashboard
      const activeVehicles = Number(enhancedData?.fleet_status?.currently_active ?? 0) || 0;
      const activitySessions = Number(enhancedData?.key_metrics?.total_sites_operated ?? 0) || 0;
      const operatingHours = Number(enhancedData?.key_metrics?.total_operational_hours ?? 0) || 0;
      
      // Check if we have any real data
      const hasActivityData = activeVehicles > 0 || activitySessions > 0 || operatingHours > 0;
      
      if (hasActivityData) {
        setActivityData([
          { label: 'Active Sites', value: Math.max(1, activitySessions), color: '#3B82F6' },
          { label: 'Operating Hours', value: Math.max(1, Math.round(operatingHours)), color: '#D97706' }
        ]);
      } else {
        setActivityData([]);
      }

      // Update continuous operations for long running chart (sites over 12 hours)
      if (enhancedData?.continuous_operations?.sites_over_24_hours?.length > 0) {
        const longRunningData = enhancedData.continuous_operations.sites_over_24_hours
          .slice(0, 5)
          .map((site: any, index: number) => ({
            label: (site.site || `Site ${index + 1}`).length > 12 
              ? (site.site || `Site ${index + 1}`).substring(0, 12) + '...' 
              : site.site || `Site ${index + 1}`,
            value: Math.max(1, Math.round(site.total_hours || site.hours || 0)),
            color: ['#D97706', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6'][index]
          }))
          .filter(site => site.value > 0);
        
        setLongRunningData(longRunningData);
      } else {
        setLongRunningData([]);
      }

      // Fetch activity report data using selected month range
      const activityParams = new URLSearchParams();
      activityParams.append('start_date', startDateString);
      activityParams.append('end_date', endDateString);
      if (siteIdFilter) {
        activityParams.append('site_id', siteIdFilter);
      } else if (costCodeFilter) {
        activityParams.append('cost_code', costCodeFilter);
      }
      
      const activityRes = await fetch(`${baseUrl}/api/energy-rite/reports/activity?${activityParams.toString()}`);
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        if (activityData.success && activityData.data) {
          setActivityReportData(activityData.data);
          
          // Morning vs Afternoon usage chart
          const morningUsage = parseFloat(activityData.data.fuel_analysis?.period_breakdown?.morning || 0);
          const afternoonUsage = parseFloat(activityData.data.fuel_analysis?.period_breakdown?.afternoon || 0);
          
          setMorningAfternoonData([
            { label: 'Morning (6AM-12PM)', value: morningUsage, color: '#3B82F6' },
            { label: 'Afternoon (12PM-6PM)', value: afternoonUsage, color: '#F59E0B' }
          ]);
          
          // Top sites by fuel usage
          const sitesWithUsage = (activityData.data.sites || [])
            .filter((site: any) => site.total_fuel_usage > 0)
            .sort((a: any, b: any) => b.total_fuel_usage - a.total_fuel_usage)
            .slice(0, 8)
            .map((site: any, index: number) => ({
              label: site.branch || site.generator,
              value: parseFloat(site.total_fuel_usage || 0),
              color: ['#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'][index]
            }));
          
          setSiteUsageData(sitesWithUsage);
        }
      }

      // Fetch snapshot data for 3-period fuel usage analysis using selected month range
      const snapshotParams = new URLSearchParams();
      snapshotParams.append('start_date', startDateString);
      snapshotParams.append('end_date', endDateString);
      snapshotParams.append('include_hierarchy', 'true');
      if (siteIdFilter) {
        snapshotParams.append('site_id', siteIdFilter);
      } else if (costCodeFilter) {
        snapshotParams.append('cost_code', costCodeFilter);
      }
      
      console.log('📸 Fetching snapshot data for fuel period analysis...');
      
      const snapshotRes = await fetch(`${baseUrl}/api/energy-rite/reports/snapshots?${snapshotParams.toString()}`);
      if (snapshotRes.ok) {
        const snapshotResult = await snapshotRes.json();
        console.log('✅ Snapshot data received:', snapshotResult);
        
        if (snapshotResult.success && snapshotResult.data) {
          setSnapshotData(snapshotResult.data);
          console.log('✅ Snapshot data set for selected month range');
        }
      } else {
        console.warn('⚠️ Could not fetch snapshot data for selected month range');
      }
      
    } catch (err) {
      console.error('❌ Error fetching executive dashboard data:', err);
      
      // Set error and default data
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      toast({
        title: 'Failed to load executive dashboard',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive'
      });
      
      // Default score card data showing 0 when no data available
      setScoreCardData([
        { value: '0.0%', label: 'Average Fuel %', barColor: 'bg-green-500' },
        { value: '0.0%', label: 'Fleet Utilization %', barColor: 'bg-blue-500' },
        { value: '0.0L/h', label: 'Avg Fuel/Hour', barColor: 'bg-orange-500' },
        { value: '0/h', label: 'Avg Cost/Hour', barColor: 'bg-red-500' }
      ]);
      
      setTopSitesData([{ label: 'No Data Available', value: 0, color: '#8B4513' }]);
      setActivityData([
        { label: 'Active Sites', value: 2200, color: '#8B4513' },
        { label: 'Over 24h', value: 600, color: '#A0522D' },
        { label: 'Total', value: 5200, color: '#CD853F' }
      ]);
      setLongRunningData([{ label: 'No Data Available', value: 0, color: '#8B4513' }]);
    } finally {
      setLoading(false);
      if (!error) {
        toast({
          title: 'Executive dashboard loaded',
          description: 'Latest metrics fetched successfully.'
        });
      }
    }
  }, [toast, isAdmin, selectedRoute, userCostCode]);

  // Fetch fuel consumption data using cumulative snapshots for current month
  const fetchPreviousDayFuelConsumption = useCallback(async () => {
    try {
      console.log('⛽ Fetching cumulative fuel consumption data...');
      
      // Get current month and year for month-to-date
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      // Priority: site_id > selectedRoute.costCode > userCostCode
      const costCodeFilter = selectedRoute?.costCode || userCostCode || '';
      const siteIdFilter = userSiteId || null;
      
      // Fetch cumulative snapshot data for selected month
      const baseUrl = getReportsApiUrl('');
      const cumulativeParams = new URLSearchParams();
      if (costCodeFilter) {
        cumulativeParams.append('cost_code', costCodeFilter);
      }
      
      const cumulativeUrl = `${baseUrl}/api/energy-rite/cumulative-snapshots/${currentYear}/${currentMonth}${cumulativeParams.toString() ? `?${cumulativeParams.toString()}` : ''}`;
      console.log('📸 Fetching cumulative snapshot data:', cumulativeUrl);
      
      const snapshotRes = await fetch(cumulativeUrl);
      if (snapshotRes.ok) {
        const snapshotResult = await snapshotRes.json();
        console.log('✅ Cumulative snapshot data received:', snapshotResult);
        
        if (snapshotResult.success && snapshotResult.data) {
          // Extract period fuel consumption from monthly_fuel_usage
          const monthlyUsage = snapshotResult.data.monthly_fuel_usage;
          const morningValue = parseFloat(monthlyUsage?.morning_7_12) || 0;
          const afternoonValue = parseFloat(monthlyUsage?.afternoon_12_17) || 0;
          const eveningValue = parseFloat(monthlyUsage?.evening_17_24) || 0;
          
          console.log('📊 Monthly fuel usage by period:', { morningValue, afternoonValue, eveningValue });
          
          // Only update if cumulative API returns non-zero data
          // (Otherwise, keep the fallback data from enhanced dashboard)
          if (morningValue > 0 || afternoonValue > 0 || eveningValue > 0) {
            setPeriodFuelUsageData([
              { label: 'Morning (7AM-12PM)', value: morningValue, color: '#10B981' },
              { label: 'Afternoon (12PM-5PM)', value: afternoonValue, color: '#A0A0A0' },
              { label: 'Evening (5PM-12AM)', value: eveningValue, color: '#87CEEB' }
            ]);
            console.log('✅ Using cumulative snapshot data for fuel period chart');
          } else if (costCodeFilter) {
            console.warn('⚠️ Cumulative API returned zeros with cost_code filter. Keeping fallback data from enhanced dashboard.');
          }
        }
      } else {
        console.warn('⚠️ Could not fetch cumulative snapshot data, using fallback from enhanced dashboard');
      }
      
    } catch (err) {
      console.error('❌ Error fetching cumulative fuel consumption data:', err);
      console.log('Using fallback data from enhanced dashboard');
    }
  }, [selectedRoute, userCostCode, userSiteId]);

  useEffect(() => {
    // Auto-fetch overall data on load and when filters/month change
    const loadData = async () => {
      await fetchDashboardData();
      // Fetch fuel consumption after dashboard data is loaded
      await fetchPreviousDayFuelConsumption();
    };
    loadData();
  }, [selectedRoute, userCostCode, userSiteId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center bg-gray-50 h-full">
        <div className="text-center">
          <div className="mx-auto mb-4 border-b-2 border-blue-600 rounded-full w-12 h-12 animate-spin"></div>
          <p className="text-gray-600">Loading executive dashboard...</p>
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
          <p className="mb-4 text-gray-500 text-sm">Unable to load dashboard data at this time</p>
          <Button onClick={fetchDashboardData} variant="outline">
            <RefreshCw className="mr-2 w-4 h-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 h-full">

      <div className="space-y-6 p-6">
        <div className="bg-white shadow-sm border-b px-6 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">{getDashboardTitle()}</h1>
                <p className="text-gray-600">{getBreadcrumbPath()}</p>
              </div>
              <Button onClick={fetchDashboardData} size="sm">
                <RefreshCw className="mr-2 w-4 h-4" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-4 font-semibold text-gray-900 text-xl">SCORE CARD</h2>
          <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {scoreCardData.map((card, index) => (
              <ScoreCard
                key={index}
                value={card.value}
                label={card.label}
                barColor={card.barColor}
                backgroundColor={card.backgroundColor}
              />
            ))}
          </div>
        </div>

        <div className="gap-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          <ChartCard title="Top 10 sites by usage">
            {topSitesData.length > 0 ? (
              <div className="w-full overflow-hidden">
                <PieChart
                  height={280}
                  series={[{
                    data: topSitesData.map((d, index) => ({ id: `top-site-${Date.now()}-${index}`, label: d.label, value: d.value, color: d.color })),
                    innerRadius: 15,
                    outerRadius: 65
                  }]}
                  slotProps={{ 
                    legend: { hidden: false }
                  }}
                  tooltip={{
                    valueFormatter: (value: number) => `${value.toFixed(1)}L`
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-72 text-gray-500">
                No data yet
              </div>
            )}
          </ChartCard>

          <ChartCard title="Fuel Consumption by Time Period">
            {periodFuelUsageData.length > 0 ? (
              <div className="w-full overflow-hidden">
                <BarChart
                  height={320}
                  xAxis={[{ 
                    scaleType: 'band', 
                    data: ['Morn\n(12am-8am)', 'Aft\n(8am-4pm)', 'Eve\n(4pm-12am)']
                  }]}
                  series={[
                    { 
                      data: [
                        periodFuelUsageData[0]?.value || 0, // Morning value
                        periodFuelUsageData[1]?.value || 0, // Afternoon value
                        periodFuelUsageData[2]?.value || 0  // Evening value
                      ],
                      color: ['#10B981', '#A0A0A0', '#87CEEB'], // Green, Light Grey, Light Blue
                      valueFormatter: (value: number | null) => value ? `${value.toFixed(1)}L` : '0.0L'
                    }
                  ]}
                  margin={{ left: 60, right: 30, top: 30, bottom: 80 }}
                  tooltip={{
                    valueFormatter: (value: number | null) => value ? `${value.toFixed(1)}L` : '0.0L'
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-72 text-gray-500">
                Loading fuel consumption data...
              </div>
            )}
          </ChartCard>

          <ChartCard title="Continuous Operations (12+ hours)">
            {longRunningData.length > 0 ? (
              <div className="w-full overflow-hidden">
                <PieChart
                  height={280}
                  series={[{
                    data: longRunningData.map((d, index) => ({ 
                      id: `long-running-${Date.now()}-${index}`, 
                      label: d.label, 
                      value: d.value, 
                      color: d.color 
                    })),
                    innerRadius: 15,
                    outerRadius: 65,
                  }]}
                  slotProps={{ legend: { hidden: false } }}
                  tooltip={{
                    valueFormatter: (value: number) => `${value}h`
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-72 text-gray-500">
                No data yet
              </div>
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}