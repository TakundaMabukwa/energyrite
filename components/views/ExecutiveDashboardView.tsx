'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { ScoreCard } from '@/components/ui/score-card';
import { ChartCard } from '@/components/ui/chart-card';
import { PieChart } from '@/components/charts/PieChart';
import { BarChart } from '@/components/charts/BarChart';
import { SemiCircleChart } from '@/components/charts/SemiCircleChart';

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
      
      // Build query parameters for cost center filtering
      const queryParams = new URLSearchParams();
      if (selectedRoute && ('costCode' in selectedRoute || 'branch' in selectedRoute)) {
        if (selectedRoute.costCode) {
          queryParams.append('costCenterId', selectedRoute.costCode);
        }
        if (selectedRoute.company) {
          queryParams.append('company', selectedRoute.company);
        }
        if (selectedRoute.branch) {
          queryParams.append('branch', selectedRoute.branch);
        }
      }
      
      const queryString = queryParams.toString();
      const baseUrl = '/api/energy-rite-proxy?endpoint=';
      
      // Fetch data from multiple endpoints concurrently
      const endpoints = [
        `${baseUrl}/api/energy-rite-vehicles/activity-statistics${queryString ? `&${queryString}` : ''}`,
        `${baseUrl}/api/energy-rite-vehicles/over-24-hours${queryString ? `&${queryString}` : ''}`,
        `${baseUrl}/api/energy-rite-vehicles/top-activity${queryString ? `&${queryString}` : ''}`,
        `${baseUrl}/api/energy-rite-vehicles/fuel-consumption${queryString ? `&${queryString}` : ''}`,
        `${baseUrl}/api/energy-rite-reports/executive-dashboard${queryString ? `&${queryString}` : ''}`
      ];
      
      console.log('🔍 Fetching from endpoints:', endpoints);
      
      const responses = await Promise.allSettled(
        endpoints.map(url => fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }))
      );
      
      // Process responses
      const [activityStatsResult, over24hResult, topActivityResult, fuelConsumptionResult, executiveResult] = responses;
      
      let activityStats = null;
      let over24hVehicles = null;
      let topActivityVehicles = null;
      let fuelConsumption = null;
      let executiveData = null;
      
      // Process activity statistics
      if (activityStatsResult.status === 'fulfilled' && activityStatsResult.value.ok) {
        const data = await activityStatsResult.value.json();
        if (data.success && data.data) {
          activityStats = data.data;
          console.log('✅ Activity statistics received:', activityStats);
        }
      }
      
      // Process over 24 hours data
      if (over24hResult.status === 'fulfilled' && over24hResult.value.ok) {
        const data = await over24hResult.value.json();
        if (data.success && data.data) {
          over24hVehicles = data.data;
          console.log('✅ Over 24 hours data received:', over24hVehicles);
        }
      }
      
      // Process top activity data
      if (topActivityResult.status === 'fulfilled' && topActivityResult.value.ok) {
        const data = await topActivityResult.value.json();
        if (data.success && data.data) {
          topActivityVehicles = data.data;
          console.log('✅ Top activity data received:', topActivityVehicles);
        }
      }
      
      // Process fuel consumption data
      if (fuelConsumptionResult.status === 'fulfilled' && fuelConsumptionResult.value.ok) {
        const data = await fuelConsumptionResult.value.json();
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
      
      console.log('📊 All data processed successfully');
      
      // Update score cards with combined data
      setScoreCardData([
        {
          value: activityStats?.total_vehicles || executiveData?.summary?.totalVehicles || 0,
          label: 'Total Vehicles',
          barColor: 'bg-blue-500'
        },
        {
          value: activityStats?.currently_active || executiveData?.summary?.vehiclesWithFuelData || 0,
          label: 'Currently Active',
          barColor: 'bg-green-500'
        },
        {
          value: activityStats?.over_24_hours || executiveData?.summary?.totalVolume || 0,
          label: 'Over 24 Hours',
          barColor: 'bg-amber-400'
        },
        {
          value: activityStats?.total_activity_hours || executiveData?.theftMetrics?.totalTheftIncidents || 0,
          label: 'Total Activity Hours',
          barColor: 'bg-purple-500'
        },
        {
          value: executiveData?.theftMetrics?.totalTheftIncidents || 0,
          label: 'Theft Incidents',
          barColor: 'bg-red-500'
        }
      ]);

      // Update top sites data from top activity vehicles
      if (topActivityVehicles && topActivityVehicles.length > 0) {
        const topSites = topActivityVehicles
          .slice(0, 10) // Top 10 sites
          .map((vehicle: any, index: number) => ({
            label: vehicle.branch ? (vehicle.branch.length > 12 ? `${vehicle.branch.substring(0, 12)}...` : vehicle.branch) : `Vehicle ${index + 1}`,
            value: Math.round(vehicle.activity_duration_hours || vehicle.hours_running || 0),
            color: ['#10B981', '#D97706', '#3B82F6', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F59E0B', '#EC4899', '#F97316'][index]
          }));
        
        setTopSitesData(topSites);
        console.log('📊 Top sites data from activity:', topSites);
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
        // Clean "No data available" message
        setTopSitesData([{
          label: 'No Data Available',
          value: 0,
          color: '#6B7280'
        }]);
      }

      // Update activity data based on activity statistics
      if (activityStats) {
        const totalActivityHours = activityStats.total_activity_hours || 0;
        const avgDuration = activityStats.avg_activity_duration || 0;
        const maxDuration = activityStats.max_activity_duration || 0;
        
        setActivityData([
          { label: 'Avg Duration', value: Math.round(avgDuration), color: '#10B981' },
          { label: 'Max Duration', value: Math.round(maxDuration), color: '#D97706' },
          { label: 'Total Hours', value: Math.round(totalActivityHours), color: '#3B82F6' }
        ]);
      } else {
        // Clean "No data available" message
        setActivityData([
          { label: 'No Data Available', value: 0, color: '#6B7280' }
        ]);
      }

      // Update long running data based on over 24 hours vehicles
      if (over24hVehicles && over24hVehicles.length > 0) {
        const longRunningData = over24hVehicles
          .slice(0, 3)
          .map((vehicle: any, index: number) => ({
            label: vehicle.branch ? (vehicle.branch.length > 15 ? `${vehicle.branch.substring(0, 15)}...` : vehicle.branch) : `Vehicle ${index + 1}`,
            value: Math.round(vehicle.hours_running || vehicle.activity_duration_hours || 0),
            color: ['#D97706', '#3B82F6', '#10B981'][index]
          }));
        
        setLongRunningData(longRunningData);
        console.log('📊 Long running data:', longRunningData);
      } else {
        // Clean "No data available" message
        setLongRunningData([{
          label: 'No Data Available',
          value: 0,
          color: '#6B7280'
        }]);
      }
      
    } catch (err) {
      console.error('❌ Error fetching executive dashboard data:', err);
      
      // Set error and default data
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      
      // Set default chart data with 0 values to ensure charts are always visible
      setScoreCardData([
        { value: 0, label: 'Total Vehicles', barColor: 'bg-gray-400' },
        { value: 0, label: 'Currently Active', barColor: 'bg-gray-400' },
        { value: 0, label: 'Over 24 Hours', barColor: 'bg-gray-400' },
        { value: 0, label: 'Total Activity Hours', barColor: 'bg-gray-400' },
        { value: 0, label: 'Theft Incidents', barColor: 'bg-gray-400' }
      ]);
      
      setTopSitesData([{
        label: 'No Data Available',
        value: 0,
        color: '#6B7280'
      }]);
      setActivityData([
        { label: 'No Data Available', value: 0, color: '#6B7280' }
      ]);
      setLongRunningData([{
        label: 'No Data Available',
        value: 0,
        color: '#6B7280'
      }]);
    } finally {
      setLoading(false);
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
            <PieChart data={topSitesData} size={200} />
          </ChartCard>

          {/* Activity Running Time */}
          <ChartCard title="Activity running time (minutes)">
            <BarChart data={activityData} maxValue={8000} height={200} />
          </ChartCard>

          {/* Ran Longer Than 24 Hours */}
          <ChartCard title="Ran longer than 24 hours">
            <PieChart data={longRunningData} size={200} />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}