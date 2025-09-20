'use client';

import React, { useState, useEffect } from 'react';
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
  const { userCostCode, isAdmin } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scoreCardData, setScoreCardData] = useState<ScoreCardData[]>([]);
  const [topSitesData, setTopSitesData] = useState<ChartData[]>([]);
  const [activityData, setActivityData] = useState<ChartData[]>([]);
  const [longRunningData, setLongRunningData] = useState<ChartData[]>([]);
  const [dashboardData, setDashboardData] = useState<ExecutiveDashboardData | null>(null);

  const getCostCenterName = () => {
    if (isAdmin) {
      return 'Executive Dashboard (All Cost Centers)';
    }
    if (userCostCode) {
      return `Executive Dashboard (${userCostCode})`;
    }
    return 'Executive Dashboard';
  };

  const getBreadcrumbPath = () => {
    if (isAdmin) {
      return 'Energyrite => All Cost Centers - (ADMIN VIEW)';
    }
    if (userCostCode) {
      return `Energyrite => User Cost Center - (COST CODE: ${userCostCode})`;
    }
    return 'Energyrite => Executive Dashboard';
  };

  // Fetch data from Energy Rite server using new executive dashboard endpoint
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 Fetching executive dashboard data from new endpoint...');
      
      // Build query parameters for month/year and cost center filtering
      const queryParams = new URLSearchParams();
      const now = new Date();
      queryParams.append('month', String(now.getMonth() + 1));
      queryParams.append('year', String(now.getFullYear()));
      // Only add cost_code filter if user is not admin
      if (!isAdmin && userCostCode) {
        queryParams.append('cost_code', userCostCode);
      }
      
      const queryString = queryParams.toString();
      const executiveUrl = `http://${process.env.NEXT_PUBLIC_SERVER_URL}/api/energy-rite/reports/executive-dashboard${queryString ? `?${queryString}` : ''}`;
      
      console.log('🔍 Fetching from executive dashboard endpoint:', executiveUrl);
      
      const response = await fetch(executiveUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch executive dashboard: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error('Invalid response from executive dashboard endpoint');
      }
      
      const executiveData = result.data;
      
      console.log('✅ Executive dashboard data received:', executiveData);
      setDashboardData(executiveData);
      
      // Update score cards using the new API structure
      setScoreCardData([
        {
          value: Number(executiveData?.score_card?.active_sites ?? 0),
          label: 'Active Sites',
          barColor: 'bg-green-500'
        },
        {
          value: Number(parseFloat(executiveData?.score_card?.total_operational_hours ?? '0') || 0),
          label: 'Operating Hours',
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
        },
        // Additional cards from current_status if available
        ...(executiveData?.current_status ? [
          {
            value: Number(executiveData.current_status.total_registered_sites ?? 0),
            label: 'Total Registered Sites',
            barColor: 'bg-indigo-500'
          },
          {
            value: Number(executiveData.current_status.currently_running ?? 0),
            label: 'Currently Running',
            barColor: 'bg-orange-500'
          },
          {
            value: Number(executiveData.current_status.active_last_24h ?? 0),
            label: 'Active Last 24h',
            barColor: 'bg-teal-500'
          },
          {
            value: Number(parseFloat(executiveData.current_status.average_fuel_level ?? '0') || 0),
            label: 'Avg Fuel Level %',
            barColor: 'bg-cyan-500'
          }
        ] : [])
      ]);

      // Log additional data sections for debugging
      console.log('📊 Current Status:', executiveData?.current_status);
      console.log('📊 Activity Patterns:', executiveData?.activity_patterns);

      // Update top sites data from top_10_sites_by_fuel_usage
      if (executiveData?.top_10_sites_by_fuel_usage?.length) {
        const topSites = executiveData.top_10_sites_by_fuel_usage
          .slice(0, 10)
          .map((site: any, index: number) => ({
            label: site.branch ? (site.branch.length > 12 ? `${site.branch.substring(0, 12)}...` : site.branch) : `Site ${index + 1}`,
            value: Math.round(parseFloat(site.total_fuel_usage || '0')),
            color: ['#10B981', '#D97706', '#3B82F6', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F59E0B', '#EC4899', '#F97316'][index]
          }));
        setTopSitesData(topSites);
      } else {
        // No data available → single brown slice
        setTopSitesData([{
          label: 'No Data Available',
          value: 0,
          color: '#8B4513'
        }]);
      }

      // Update activity data using session metrics and activity patterns
      const completedSessions = Number(executiveData?.score_card?.completed_sessions ?? 0);
      const ongoingSessions = Number(executiveData?.score_card?.ongoing_sessions ?? 0);
      const totalSessions = completedSessions + ongoingSessions;
      
      // Use activity patterns if available, otherwise fall back to session metrics
      if (executiveData?.activity_patterns?.daily_breakdown?.length) {
        const dailyData = executiveData.activity_patterns.daily_breakdown[0]; // Most recent day
        setActivityData([
          { label: 'Sessions Started', value: Number(dailyData?.sessions_started ?? 0), color: '#10B981' },
          { label: 'Sessions Completed', value: Number(dailyData?.sessions_completed ?? 0), color: '#3B82F6' },
          { label: 'Daily Operating Hours', value: Number(parseFloat(dailyData?.daily_operating_hours ?? '0') || 0), color: '#D97706' }
        ]);
      } else {
        setActivityData([
          { label: 'Completed Sessions', value: completedSessions, color: '#10B981' },
          { label: 'Ongoing Sessions', value: ongoingSessions, color: '#D97706' },
          { label: 'Total Sessions', value: totalSessions, color: '#3B82F6' }
        ]);
      }

      // Update long running data based on sites_running_over_24h or running_time_distribution
      if (executiveData?.activity_patterns?.running_time_distribution?.length) {
        // Use running time distribution from activity patterns
        const longRunningData = executiveData.activity_patterns.running_time_distribution
          .slice(0, 3)
          .map((dist: any, index: number) => ({
            label: dist.duration_category || `Category ${index + 1}`,
            value: Number(dist.session_count || 0),
            color: ['#D97706', '#3B82F6', '#10B981'][index]
          }));
        setLongRunningData(longRunningData);
      } else if (executiveData?.sites_running_over_24h?.length) {
        // Fallback to sites running over 24h
        const longRunningData = executiveData.sites_running_over_24h
          .slice(0, 3)
          .map((site: any, index: number) => ({
            label: site.branch ? (site.branch.length > 15 ? `${site.branch.substring(0, 15)}...` : site.branch) : `Site ${index + 1}`,
            value: Math.round(parseFloat(site.total_operating_hours || '0')),
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
    // Auto-fetch data on load for user's cost code (or all data for admin)
    if (userCostCode || isAdmin) {
      fetchDashboardData();
    }
  }, [userCostCode, isAdmin]);

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

      {/* Main Content */}
      <div className="space-y-6 p-6">
        {/* Header with refresh button */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-semibold text-blue-600 text-2xl">{getCostCenterName()}</h1>
            <p className="mt-1 text-gray-600 text-sm">{getBreadcrumbPath()}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={fetchDashboardData}>
              <RefreshCw className="mr-2 w-4 h-4" />
              Refresh
            </Button>
            {dashboardData && (
              <div className="text-gray-500 text-sm">
                Last updated: {formatForDisplay(new Date().toISOString())}
              </div>
            )}
          </div>
        </div>
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