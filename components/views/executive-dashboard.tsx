'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Fuel, Clock, TrendingUp, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

interface TopUsageSite {
  location: string;
  cost_code: string;
  total_fuel_consumed: number;
  total_sessions: number;
  avg_session_duration: number;
  last_activity: string;
}

interface LongRunningSite {
  location: string;
  cost_code: string;
  current_session_hours: number;
  fuel_consumed_current_session: number;
  status: string;
  session_start: string;
}

interface DashboardData {
  active_sites: number;
  total_sessions_24h: number;
  total_fuel_consumed_24h: number;
  avg_session_duration_24h: number;
  sites_with_anomalies: number;
  cost_code_filter?: string;
}

export function ExecutiveDashboard() {
  const [topUsage, setTopUsage] = useState<TopUsageSite[]>([]);
  const [longRunning, setLongRunning] = useState<LongRunningSite[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [selectedCostCode, setSelectedCostCode] = useState<string>('all');
  const [costCodes, setCostCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (costCode: string = 'all') => {
    setLoading(true);
    setError(null);
    
    try {
      const baseParams = costCode !== 'all' ? `?cost_code=${costCode}` : '';
      
      const [topUsageRes, longRunningRes, dashboardRes] = await Promise.all([
        fetch(`/api/energy-rite/monitoring/top-usage${baseParams}&days=30&limit=10`),
        fetch(`/api/energy-rite/monitoring/long-running${baseParams}&hours=24`),
        fetch(`/api/energy-rite/monitoring/dashboard${baseParams}`)
      ]);

      if (!topUsageRes.ok || !longRunningRes.ok || !dashboardRes.ok) {
        throw new Error('Failed to fetch monitoring data');
      }

      const [topUsageData, longRunningData, dashboardData] = await Promise.all([
        topUsageRes.json(),
        longRunningRes.json(),
        dashboardRes.json()
      ]);

      setTopUsage(topUsageData.data?.top_usage_sites || []);
      setLongRunning(longRunningData.data?.long_running_sites || []);
      setDashboard(dashboardData.data || null);

      // Extract unique cost codes for filter
      const allCostCodes = new Set<string>();
      topUsageData.data?.top_usage_sites?.forEach((site: TopUsageSite) => {
        if (site.cost_code && site.cost_code !== 'N/A') {
          allCostCodes.add(site.cost_code);
        }
      });
      setCostCodes(Array.from(allCostCodes).sort());

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedCostCode);
  }, [selectedCostCode]);

  const handleCostCodeChange = (value: string) => {
    setSelectedCostCode(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">Error loading dashboard: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Executive Dashboard</h1>
          <p className="text-gray-600">Real-time fuel monitoring and site performance</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={selectedCostCode} onValueChange={handleCostCodeChange}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filter by cost code" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cost Codes</SelectItem>
              {costCodes.map((code) => (
                <SelectItem key={code} value={code}>{code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button onClick={() => fetchData(selectedCostCode)} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sites</CardTitle>
              <Activity className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{dashboard.active_sites}</div>
              <p className="text-xs text-gray-600">Currently operational</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">24h Sessions</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{dashboard.total_sessions_24h}</div>
              <p className="text-xs text-gray-600">Total sessions today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">24h Fuel Usage</CardTitle>
              <Fuel className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {dashboard.total_fuel_consumed_24h?.toFixed(1) || '0'}L
              </div>
              <p className="text-xs text-gray-600">Consumed today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Anomalies</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{dashboard.sites_with_anomalies || 0}</div>
              <p className="text-xs text-gray-600">Sites with issues</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Usage Sites */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Top Fuel Consumers (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topUsage.length > 0 ? (
                topUsage.map((site, index) => (
                  <div key={`${site.location}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{site.location}</div>
                      <div className="text-sm text-gray-600">
                        {site.cost_code && site.cost_code !== 'N/A' ? site.cost_code : 'No cost code'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {site.total_sessions} sessions • Avg {site.avg_session_duration?.toFixed(1)}h
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-orange-600">
                        {site.total_fuel_consumed?.toFixed(1)}L
                      </div>
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No usage data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Long Running Sites */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              Long Running Sites (24h+)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {longRunning.length > 0 ? (
                longRunning.map((site, index) => (
                  <div key={`${site.location}-${index}`} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{site.location}</div>
                      <div className="text-sm text-gray-600">
                        {site.cost_code && site.cost_code !== 'N/A' ? site.cost_code : 'No cost code'}
                      </div>
                      <div className="text-xs text-amber-700">
                        Running for {site.current_session_hours?.toFixed(1)}h
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-amber-600">
                        {site.fuel_consumed_current_session?.toFixed(1)}L
                      </div>
                      <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800">
                        {site.status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  No long-running sites
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Info */}
      {selectedCostCode !== 'all' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-100 text-blue-800">
              Filtered by: {selectedCostCode}
            </Badge>
            <span className="text-blue-700 text-sm">
              Showing data for cost code {selectedCostCode} only
            </span>
          </div>
        </div>
      )}
    </div>
  );
}