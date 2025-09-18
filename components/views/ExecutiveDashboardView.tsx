'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { ScoreCard } from '@/components/ui/score-card';
import { ChartCard } from '@/components/ui/chart-card';
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scoreCardData, setScoreCardData] = useState<ScoreCardData[]>([]);
  const [topSitesData, setTopSitesData] = useState<ChartData[]>([]);
  const [activityData, setActivityData] = useState<ChartData[]>([]);
  const [longRunningData, setLongRunningData] = useState<ChartData[]>([]);
  const [dashboardData, setDashboardData] = useState<ExecutiveDashboardData | null>(null);

  const getCostCenterName = () => {
    if (selectedRoute && 'name' in selectedRoute) {
      return selectedRoute.name as string;
    }
    return 'Executive Dashboard';
  };

  const getBreadcrumbPath = () => {
    if (selectedRoute && 'name' in selectedRoute) {
      const costCenterName = selectedRoute.name as string;
      return `Energyrite => KFC => ${costCenterName} - (COST CODE: ${selectedRoute.costCode || 'KFC-ALCFOOD'})`;
    }
    return 'Energyrite => KFC => Executive Overview';
  };

  // Fetch data from Energy Rite server using multiple endpoints
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 Fetching executive dashboard data from multiple endpoints...');
      
      // Build query parameters for month/year and cost center filtering (new API guide)
      const queryParams = new URLSearchParams();
      const now = new Date();
      queryParams.append('month', String(now.getMonth() + 1));
      queryParams.append('year', String(now.getFullYear()));
      if (selectedRoute && ('costCode' in selectedRoute)) {
        if (selectedRoute.costCode) {
          queryParams.append('cost_code', selectedRoute.costCode);
        }
      }
      
      const queryString = queryParams.toString();
      const baseUrl = '/api/energy-rite-proxy?endpoint=';
      
      // Fetch data from documented endpoints concurrently
      const endpoints = [
        `${baseUrl}/api/energy-rite/reports/executive-dashboard${queryString ? `&${queryString}` : ''}`,
        `${baseUrl}/api/energy-rite/fuel-analysis/consumption-analysis${queryString ? `&${queryString}` : ''}`,
        `${baseUrl}/api/energy-rite/fuel-analysis/anomalies${queryString ? `&${queryString}` : ''}`,
        `${baseUrl}/api/energy-rite/vehicles/stats${queryString ? `&${queryString}` : ''}`
      ];
      
      console.log('🔍 Fetching from endpoints:', endpoints);
      
      const responses = await Promise.allSettled(
        endpoints.map(url => fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }))
      );
      
      // Process responses
      const [executiveResult, consumptionResult, anomaliesResult, vehiclesStatsResult] = responses;
      
      let vehiclesStats: any = null;
      let fuelConsumption: any = null;
      let executiveData: any = null;
      let anomaliesCount = 0;
      
      // Process consumption analysis
      if (consumptionResult.status === 'fulfilled' && consumptionResult.value.ok) {
        const data = await consumptionResult.value.json();
        if (data.success && data.data) {
          fuelConsumption = data.data;
          console.log('✅ Fuel consumption data received:', fuelConsumption);
        }
      }
      
      // Process executive dashboard data
      if (executiveResult.status === 'fulfilled' && executiveResult.value.ok) {
        const data = await executiveResult.value.json();
        if (data.success && data.data) {
          executiveData = data.data;
          console.log('✅ Executive dashboard data received:', executiveData);
        }
      }
      
      // Process vehicles statistics
      if (vehiclesStatsResult.status === 'fulfilled' && vehiclesStatsResult.value.ok) {
        const data = await vehiclesStatsResult.value.json();
        if (data.success && data.data) {
          vehiclesStats = data.data;
          console.log('✅ Vehicles stats received:', vehiclesStats);
        }
      }

      // Process anomalies
      if (anomaliesResult.status === 'fulfilled' && anomaliesResult.value.ok) {
        const data = await anomaliesResult.value.json();
        if (data.success && data.data) {
          const list = Array.isArray(data.data?.anomalies) ? data.data.anomalies : (Array.isArray(data.data) ? data.data : []);
          anomaliesCount = list.length;
          console.log('✅ Anomalies count:', anomaliesCount);
        }
      }
      
      console.log('📊 All data processed successfully');
      
      // Update score cards with executive score_card data
      setScoreCardData([
        {
          value: Number(executiveData?.score_card?.sites_running_over_day ?? 0),
          label: 'Sites Running Today',
          barColor: 'bg-green-500'
        },
        {
          value: Number(parseFloat(executiveData?.score_card?.total_hours_running ?? '0') || 0),
          label: 'Hours Running',
          barColor: 'bg-blue-500'
        },
        {
          value: Number(parseFloat(executiveData?.score_card?.total_litres_filled ?? '0') || 0),
          label: 'Litres Filled',
          barColor: 'bg-purple-500'
        },
        {
          value: Number(parseFloat(executiveData?.score_card?.total_litres_used ?? '0') || 0),
          label: 'Litres Used',
          barColor: 'bg-red-500'
        }
      ]);

      // Update top sites data from top activity vehicles
      if (executiveData?.top_10_sites_by_fuel_usage?.length) {
        const topSites = executiveData.top_10_sites_by_fuel_usage
          .slice(0, 10)
          .map((site: any, index: number) => ({
            label: site.branch ? (site.branch.length > 12 ? `${site.branch.substring(0, 12)}...` : site.branch) : `Site ${index + 1}`,
            value: Math.round(site.total_fuel_usage || 0),
            color: ['#10B981', '#D97706', '#3B82F6', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F59E0B', '#EC4899', '#F97316'][index]
          }));
        setTopSitesData(topSites);
      } else if (executiveData?.branchBreakdown) {
        // Fallback to executive data branch breakdown
        const topBranches = Object.entries(executiveData.branchBreakdown)
          .sort(([, a], [, b]) => (b.totalVolume || 0) - (a.totalVolume || 0))
          .slice(0, 10)
          .map(([branch, data], index) => ({
            label: branch.length > 12 ? `${branch.substring(0, 12)}...` : branch,
            value: Math.round(data.totalVolume || 0),
            color: ['#10B981', '#D97706', '#3B82F6', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F59E0B', '#EC4899', '#F97316'][index]
          }));
        
        setTopSitesData(topBranches);
        console.log('📊 Top sites data from executive:', topBranches);
      } else {
        // No data available → single brown slice
        setTopSitesData([{
          label: 'No Data Available',
          value: 0,
          color: '#8B4513'
        }]);
      }

      // Update activity running time (minutes) using executive score_card values
      const hoursRunning = Number(parseFloat(executiveData?.score_card?.total_hours_running ?? '0') || 0);
      const hoursNotRunning = Number(parseFloat(executiveData?.score_card?.total_hours_not_running ?? '0') || 0);
      const runningMinutes = Math.round(hoursRunning * 60);
      const notRunningMinutes = Math.round(hoursNotRunning * 60);
      const totalMinutes = runningMinutes + notRunningMinutes;
      setActivityData([
        { label: 'Running', value: runningMinutes, color: '#10B981' },
        { label: 'Not Running', value: notRunningMinutes, color: '#D97706' },
        { label: 'Total', value: totalMinutes, color: '#3B82F6' }
      ]);

      // Update long running data based on executive sites_running_over_24h
      if (executiveData?.sites_running_over_24h?.length) {
        const longRunningData = executiveData.sites_running_over_24h
          .slice(0, 3)
          .map((site: any, index: number) => ({
            label: site.branch ? (site.branch.length > 15 ? `${site.branch.substring(0, 15)}...` : site.branch) : `Site ${index + 1}`,
            value: Math.round(site.total_running_hours || 0),
            color: ['#D97706', '#3B82F6', '#10B981'][index]
          }));
        setLongRunningData(longRunningData);
      } else {
        // No data available → single brown slice
        setLongRunningData([{
          label: 'No Data Available',
          value: 0,
          color: '#8B4513'
        }]);
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
      
      // Default chart data with explicit no-data states
      setScoreCardData([
        { value: 0, label: 'Sites Running Today', barColor: 'bg-gray-400' },
        { value: 0, label: 'Hours Running', barColor: 'bg-gray-400' },
        { value: 0, label: 'Litres Filled', barColor: 'bg-gray-400' },
        { value: 0, label: 'Litres Used', barColor: 'bg-gray-400' }
      ]);
      
      setTopSitesData([{ label: 'No Data Available', value: 0, color: '#8B4513' }]);
      setActivityData([
        { label: 'Active Vehicles', value: 2200, color: '#8B4513' },
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
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedRoute]);

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
            <Button variant="outline" size="sm" onClick={fetchDashboardData}>
              <RefreshCw className="mr-2 w-4 h-4" />
              Refresh
            </Button>
            {dashboardData && (
              <div className="text-gray-500 text-sm">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6 p-6">
        {/* Score Card Section */}
        <div>
          <h2 className="mb-4 font-semibold text-gray-900 text-xl">SCORE CARD</h2>
          <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5">
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

        {/* Charts Section */}
        <div className="gap-6 grid grid-cols-1 lg:grid-cols-3">
          {/* Top 10 Sites by Usage */}
          <ChartCard title="Top 10 sites by usage">
            <PieChart
              height={260}
              series={[{
                data: topSitesData.map((d) => ({ id: d.label, label: d.label, value: d.value, color: d.color })),
                innerRadius: 20,
                outerRadius: 100,
              }]}
              slotProps={{ legend: { hidden: false } }}
            />
          </ChartCard>

          {/* Activity Running Time */}
          <ChartCard title="Activity running time (minutes)">
            <BarChart
              height={260}
              xAxis={[{ scaleType: 'band', data: activityData.map((d) => d.label) }]}
              series={[{ data: activityData.map((d) => d.value), color: '#3B82F6' }]}
            />
          </ChartCard>

          {/* Ran Longer Than 24 Hours */}
          <ChartCard title="Ran longer than 24 hours">
            <PieChart
              height={260}
              series={[{
                data: longRunningData.map((d) => ({ id: d.label, label: d.label, value: d.value, color: d.color })),
                innerRadius: 20,
                outerRadius: 100,
              }]}
              slotProps={{ legend: { hidden: false } }}
            />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}