'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { TopNavigation } from '@/components/layout/TopNavigation';
import { RefreshCw } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useUser } from '@/contexts/UserContext';
import { ScoreCard } from '@/components/ui/score-card';
import { ChartCard } from '@/components/ui/chart-card';
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { useToast } from '@/hooks/use-toast';
import { formatForDisplay } from '@/lib/utils/date-formatter';

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
  const [morningAfternoonData, setMorningAfternoonData] = useState<ChartData[]>([]);
  const [siteUsageData, setSiteUsageData] = useState<ChartData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedCostCode, setSelectedCostCode] = useState('');

  const getCostCenterDisplayName = (costCode: string) => {
    const costCenterNames: Record<string, string> = {
      'KFC-0001-0001-0002-0004': 'KFC Main Branch',
      'KFC-0001-0001-0003': 'KFC Secondary Branch'
    };
    return costCenterNames[costCode] || costCode;
  };

  const getDashboardTitle = () => {
    const monthName = new Date(selectedMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    return `Executive Dashboard (${monthName})`;
  };

  const getBreadcrumbPath = () => {
    const monthName = new Date(selectedMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    return `Energyrite => Executive Dashboard - ${monthName}`;
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
      
      // Fetch from new executive dashboard endpoint
      const baseUrl = `http://${process.env.NEXT_PUBLIC_API_HOST}:${process.env.NEXT_PUBLIC_API_PORT}`;
      const params = new URLSearchParams();
      if (selectedMonth) params.append('month', selectedMonth);
      if (siteIdFilter) {
        params.append('site_id', siteIdFilter);
      } else if (costCodeFilter) {
        params.append('costCode', costCodeFilter);
      }
      const queryString = params.toString() ? `?${params.toString()}` : '';
      
      console.log('🔍 API URL will be:', `${baseUrl}/api/energy-rite/executive-dashboard${queryString}`);
      const costCodeParam = costCodeFilter ? `?cost_code=${costCodeFilter}` : '';
      
      const dashboardRes = await fetch(`${baseUrl}/api/energy-rite/executive-dashboard${queryString}`);
      
      if (!dashboardRes.ok) {
        throw new Error('Failed to fetch executive dashboard data');
      }
      
      const dashboardData = await dashboardRes.json();
      
      console.log('✅ Executive dashboard data received:', dashboardData);
      setDashboardData(dashboardData.data);
      
      // Update score cards using executive dashboard data
      const executiveData = dashboardData.data;
      console.log('Executive data for score cards:', executiveData);
      console.log('Average fuel percentage:', executiveData?.average_fuel_percentage);
      console.log('Fleet utilization percentage:', executiveData?.fleet_utilization_percentage);
      
      // Extract key metrics for score cards
      const totalSites = executiveData?.fleet_overview?.total_sites || 0;
      const totalFuelUsage = executiveData?.operational_metrics?.total_fuel_usage_liters || 0;
      const opHours = executiveData?.operational_metrics?.total_operating_hours;
      const totalSessions = executiveData?.operational_metrics?.total_sessions || 0;
      
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
          value: (opHours !== null && opHours !== undefined) ? `${Number(opHours).toFixed(1)}h` : '0.0h',
          label: 'Total Op Hours',
          barColor: 'bg-orange-500'
        },
        {
          value: totalSessions,
          label: 'Total Sessions',
          barColor: 'bg-purple-500'
        }
      ]);

      // Update top sites data from executive dashboard
      if (executiveData?.top_performing_sites?.length > 0) {
        const topSites = executiveData.top_performing_sites
          .map((site: any, index: number) => ({
            label: site.site || `Site ${index + 1}`,
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

      // Update activity data using executive dashboard
      const activeVehicles = Number(executiveData?.fleet_overview?.active_vehicles ?? 0) || 0;
      const activitySessions = Number(executiveData?.operational_metrics?.total_sessions ?? 0) || 0;
      const operatingHours = Number(executiveData?.operational_metrics?.total_operating_hours ?? 0) || 0;
      
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

      // Update cost center breakdown for long running chart (only > 24 hours)
      if (executiveData?.cost_center_performance?.length > 0) {
        const costCenterData = executiveData.cost_center_performance
          .filter((center: any) => center.operating_hours > 24)
          .slice(0, 3)
          .map((center: any, index: number) => ({
            label: center.sites?.[0] || `Site ${index + 1}`,
            value: Math.max(1, Math.round(center.operating_hours || 0)),
            color: ['#D97706', '#3B82F6', '#10B981'][index]
          }))
          .filter(center => center.value > 0);
        
        setLongRunningData(costCenterData);
      } else {
        setLongRunningData([]);
      }

      // Fetch activity report data
      const activityParams = new URLSearchParams();
      const today = new Date().toISOString().split('T')[0];
      activityParams.append('date', today);
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
  }, [toast, isAdmin, selectedRoute, userCostCode, selectedMonth]);

  useEffect(() => {
    // Auto-fetch overall data on load
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-fetch data when month changes
  useEffect(() => {
    fetchDashboardData();
  }, [selectedMonth]);

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
      <TopNavigation />

      <div className="space-y-6 p-6">
        <div className="bg-white shadow-sm border-b px-6 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">{getDashboardTitle()}</h1>
                <p className="text-gray-600">{getBreadcrumbPath()}</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Button onClick={fetchDashboardData} size="sm">
                  <RefreshCw className="mr-2 w-4 h-4" />
                  Update
                </Button>
              </div>
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
                  slotProps={{ legend: { hidden: false } }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-72 text-gray-500">
                No data yet
              </div>
            )}
          </ChartCard>

          <ChartCard title="Activity running time (minutes)">
            {activityData.length > 0 ? (
              <div className="w-full overflow-hidden">
                <BarChart
                  height={280}
                  xAxis={[{ scaleType: 'band', data: activityData.map((d) => d.label) }]}
                  series={[{ data: activityData.map((d) => d.value), color: '#3B82F6' }]}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-72 text-gray-500">
                No data yet
              </div>
            )}
          </ChartCard>

          <ChartCard title="Ran longer than 24 hours">
            {longRunningData.length > 0 ? (
              <div className="w-full overflow-hidden">
                <PieChart
                  height={280}
                  series={[{
                    data: longRunningData.map((d, index) => ({ id: `long-running-${Date.now()}-${index}`, label: d.label, value: d.value, color: d.color })),
                    innerRadius: 15,
                    outerRadius: 65,
                  }]}
                  slotProps={{ legend: { hidden: false } }}
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