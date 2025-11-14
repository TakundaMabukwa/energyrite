'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { TopNavigation } from '@/components/layout/TopNavigation';
import { RefreshCw, Calendar, Clock, Fuel, TrendingUp } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import { formatForDisplay } from '@/lib/utils/date-formatter';

interface ActivitySnapshotsViewProps {
  onBack?: () => void;
}

interface SnapshotData {
  time_slot: string;
  time_slot_name: string;
  active_vehicles: number;
  total_vehicles: number;
  activity_percentage: number;
  average_fuel_percentage: number;
  snapshot_time: string;
}

interface DailySnapshot {
  date: string;
  morning?: SnapshotData;
  afternoon?: SnapshotData;
  evening?: SnapshotData;
  peak_slot: string;
  peak_activity: number;
}

interface ActivityDashboardData {
  period: {
    start_date: string;
    end_date: string;
  };
  summary: {
    total_snapshots: number;
    overall_peak_time_slot: string;
    evening_peak_percentage: number;
  };
  daily_snapshots: DailySnapshot[];
  cost_code_patterns: Record<string, any>;
  site_utilization: Record<string, any>;
}

export function ActivitySnapshotsView({ onBack }: ActivitySnapshotsViewProps) {
  const { selectedRoute } = useApp();
  const { userCostCode, isAdmin } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to today
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [dashboardData, setDashboardData] = useState<ActivityDashboardData | null>(null);

  const fetchActivityData = async (date: string) => {
    try {
      setLoading(true);
      setError(null);

      // Build cost_code filter - admin sees all, non-admin sees selected route
      const costCodeFilter = isAdmin ? '' : (selectedRoute?.costCode || userCostCode || '');
      const baseUrl = '/api/energy-rite/activity-reports';
      
      // Fetch activity dashboard for specific date
      const dashboardUrl = `${baseUrl}/dashboard?startDate=${date}&endDate=${date}${costCodeFilter ? `&cost_code=${costCodeFilter}` : ''}`;
      console.log('🔍 Fetching activity dashboard:', dashboardUrl);
      
      const response = await fetch(dashboardUrl);
      if (!response.ok) throw new Error(`Failed to fetch activity data: ${response.status}`);
      
      const result = await response.json();
      if (!result.success) throw new Error('Invalid response from activity dashboard');
      
      const data = result.data;
      setDashboardData(data);
      
      console.log('✅ Activity data loaded:', data);
      
    } catch (err) {
      console.error('❌ Error fetching activity data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      toast({
        title: 'Failed to load activity data',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityData(selectedDate);
  }, [selectedDate, selectedRoute, userCostCode, isAdmin]);

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
  };

  const getTimeSlotIcon = (timeSlot: string) => {
    switch (timeSlot) {
      case 'morning': return '🌅';
      case 'afternoon': return '☀️';
      case 'evening': return '🌆';
      default: return '⏰';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center bg-gray-50 h-full">
        <div className="text-center">
          <div className="mx-auto mb-4 border-b-2 border-blue-600 rounded-full w-12 h-12 animate-spin"></div>
          <p className="text-gray-600">Loading activity snapshots...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center bg-gray-50 h-full">
        <div className="text-center">
          <div className="mx-auto mb-4 text-red-500 text-6xl">⚠️</div>
          <p className="mb-4 font-medium text-gray-600 text-lg">Error Loading Data</p>
          <p className="mb-4 text-gray-500 text-sm">{error}</p>
          <Button onClick={() => fetchActivityData(selectedDate)} variant="outline">
            <RefreshCw className="mr-2 w-4 h-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const dayData = dashboardData?.daily_snapshots?.[0];

  return (
    <div className="bg-gray-50 h-full">
      <TopNavigation />

      {/* Header */}
      <div className="flex justify-between items-center p-6 pb-4">
        <div>
          <h1 className="font-semibold text-blue-600 text-2xl">Activity Snapshots</h1>
          <p className="mt-1 text-gray-600 text-sm">
            Daily activity patterns - {formatForDisplay(selectedDate)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <Button onClick={() => fetchActivityData(selectedDate)} variant="outline" size="sm">
            <RefreshCw className="mr-2 w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Time Slot Cards */}
      <div className="px-6 pb-6">
        <div className="gap-6 grid grid-cols-1 md:grid-cols-3 mb-8">
          {['morning', 'afternoon', 'evening'].map((timeSlot) => {
            const slotData = dayData?.[timeSlot as keyof DailySnapshot] as SnapshotData;
            const isPeak = dayData?.peak_slot === timeSlot;
            
            return (
              <div
                key={timeSlot}
                className={`p-6 rounded-lg border-2 ${
                  isPeak 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getTimeSlotIcon(timeSlot)}</span>
                    <h3 className="font-semibold text-gray-900 capitalize">
                      {timeSlot}
                    </h3>
                  </div>
                  {isPeak && (
                    <span className="px-2 py-1 bg-green-100 rounded-full text-green-700 text-xs font-medium">
                      Peak
                    </span>
                  )}
                </div>
                
                {slotData ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Active Vehicles</span>
                      <span className="font-bold text-lg">
                        {slotData.active_vehicles}/{slotData.total_vehicles}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Activity Rate</span>
                      <span className="font-semibold text-blue-600">
                        {slotData.activity_percentage?.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Avg Fuel Level</span>
                      <span className="font-semibold text-orange-600">
                        {slotData.average_fuel_percentage?.toFixed(1)}%
                      </span>
                    </div>
                    <div className="pt-2 border-t text-xs text-gray-500">
                      {formatForDisplay(slotData.snapshot_time)}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 text-sm">
                    No snapshot data
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Branch Fuel Usage Table */}
        <div className="bg-white rounded-lg border">
          <div className="flex items-center gap-2 p-4 border-b">
            <Fuel className="w-5 h-5 text-blue-500" />
            <h2 className="font-semibold text-gray-900">Fuel Usage by Branch</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost Code</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Morning</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Afternoon</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Evening</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fuel Used</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dayData ? (
                  Object.entries(dashboardData?.site_utilization || {})
                    .slice(0, 20)
                    .map(([site, data]: [string, any]) => {
                      const morningData = dayData.morning?.vehicles_data?.find((v: any) => v.branch === site);
                      const afternoonData = dayData.afternoon?.vehicles_data?.find((v: any) => v.branch === site);
                      const eveningData = dayData.evening?.vehicles_data?.find((v: any) => v.branch === site);
                      const fuelUsed = (morningData?.fuel_level || 0) - (eveningData?.fuel_level || 0);
                      const activityCount = [morningData, afternoonData, eveningData].filter(v => v?.is_active).length;
                      
                      return (
                        <tr key={site} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {site}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {data.cost_code || '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">
                            {morningData?.fuel_level?.toFixed(1) || '-'}L
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">
                            {afternoonData?.fuel_level?.toFixed(1) || '-'}L
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">
                            {eveningData?.fuel_level?.toFixed(1) || '-'}L
                          </td>
                          <td className={`px-4 py-3 text-right text-sm font-semibold ${
                            fuelUsed > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {fuelUsed > 0 ? '-' : '+'}{Math.abs(fuelUsed).toFixed(1)}L
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              activityCount > 0 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {activityCount}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No snapshot data available for selected date
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}