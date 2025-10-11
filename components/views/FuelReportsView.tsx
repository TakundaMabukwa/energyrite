'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TopNavigation } from '@/components/layout/TopNavigation';
import { Download, Fuel, RefreshCw, FileX, Plus } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';

interface FuelReportsViewProps {
  onBack: () => void;
}

interface FuelReport {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  date: string;
  isLatest?: boolean;
  downloadUrl?: string;
  size?: string;
  sessions?: any[];
  summary?: any;
}

interface ReportData {
  statistics: {
    total_vehicles: string;
    theft_incidents: string;
    vehicles_with_fuel_data: string;
    total_volume_capacity: string;
  };
  companyBreakdown: Array<{
    company: string;
    vehicle_count: string;
    theft_count: string;
    total_volume: string;
  }>;
  branchBreakdown: Array<{
    branch: string;
    company: string;
    vehicle_count: string;
    theft_count: string;
    total_volume: string | null;
  }>;
  lastUpdated: string;
}

interface ReportDocument {
  id: string;
  name: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  date: string;
  size: string;
  downloadUrl: string;
  createdAt: string;
  description?: string;
}

interface TheftStatistics {
  total_vehicles: number;
  vehicles_with_theft: number;
  total_theft_incidents: number;
  theft_rate_percentage: number;
  recent_theft_incidents: Array<{
    plate: string;
    branch: string;
    theft_time: string;
    fuel_drop: number;
    time_window: string;
  }>;
}

interface VehicleWithTheft {
  plate: string;
  branch: string;
  company: string;
  fuel_anomaly: string;
  fuel_anomaly_note: string;
  theft_time: string;
  last_message_date: string;
}

export function FuelReportsView({ onBack }: FuelReportsViewProps) {
  const { selectedRoute } = useApp();
  const { userCostCode, isAdmin } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theftStats, setTheftStats] = useState<TheftStatistics | null>(null);
  const [vehiclesWithTheft, setVehiclesWithTheft] = useState<VehicleWithTheft[]>([]);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [availableReports, setAvailableReports] = useState<FuelReport[]>([]);
  const [reportDocuments, setReportDocuments] = useState<ReportDocument[]>([]);

  // Fetch engine sessions reports filtered by cost code
  const fetchTheftData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // For admin users, don't filter by cost code. For regular users, use their cost code
      const costCode = isAdmin ? null : userCostCode;
      
      if (!isAdmin && !userCostCode) {
        console.log('⚠️ No cost code available for user, cannot fetch reports');
        setReportDocuments([]);
        setAvailableReports([]);
        return;
      }
      
      console.log('🔍 Fetching engine sessions reports:', isAdmin ? 'for all cost codes (admin)' : `for user cost code: ${userCostCode}`);
      
      // Fetch engine sessions for different time periods
      const today = new Date().toISOString().split('T')[0];
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const baseUrl = `http://${process.env.NEXT_PUBLIC_SERVER_URL}/api/energy-rite/reports/engine-sessions`;
      
      // Build URLs with conditional cost_code parameter
      const dailyParams = new URLSearchParams({ date: today });
      if (costCode) dailyParams.append('cost_code', costCode);
      const dailyUrl = `${baseUrl}?${dailyParams.toString()}`;
      console.log('📅 Fetching daily report:', dailyUrl);
      
      const weeklyParams = new URLSearchParams({ start_date: oneWeekAgo, end_date: today });
      if (costCode) weeklyParams.append('cost_code', costCode);
      const weeklyUrl = `${baseUrl}?${weeklyParams.toString()}`;
      console.log('📅 Fetching weekly report:', weeklyUrl);
      
      const monthlyParams = new URLSearchParams({ start_date: oneMonthAgo, end_date: today });
      if (costCode) monthlyParams.append('cost_code', costCode);
      const monthlyUrl = `${baseUrl}?${monthlyParams.toString()}`;
      console.log('📅 Fetching monthly report:', monthlyUrl);
      
      // Fetch all reports in parallel
      const [dailyResponse, weeklyResponse, monthlyResponse] = await Promise.all([
        fetch(dailyUrl),
        fetch(weeklyUrl),
        fetch(monthlyUrl)
      ]);
      
      const reports: FuelReport[] = [];
      
      // Process daily report
      if (dailyResponse.ok) {
        const dailyData = await dailyResponse.json();
        if (dailyData.success && dailyData.data?.sessions?.length > 0) {
          reports.push({
            id: 'daily-' + today,
            type: 'daily',
            date: today,
            isLatest: true,
            downloadUrl: '#', // Engine sessions don't have direct download URLs
            size: `${dailyData.data.sessions.length} sessions`,
            sessions: dailyData.data.sessions,
            summary: dailyData.data.summary
          });
          console.log('✅ Daily report loaded:', dailyData.data.sessions.length, 'sessions');
        }
      }
      
      // Process weekly report
      if (weeklyResponse.ok) {
        const weeklyData = await weeklyResponse.json();
        if (weeklyData.success && weeklyData.data?.sessions?.length > 0) {
          reports.push({
            id: 'weekly-' + oneWeekAgo + '-' + today,
            type: 'weekly',
            date: `${oneWeekAgo} to ${today}`,
            isLatest: true,
            downloadUrl: '#',
            size: `${weeklyData.data.sessions.length} sessions`,
            sessions: weeklyData.data.sessions,
            summary: weeklyData.data.summary
          });
          console.log('✅ Weekly report loaded:', weeklyData.data.sessions.length, 'sessions');
        }
      }
      
      // Process monthly report
      if (monthlyResponse.ok) {
        const monthlyData = await monthlyResponse.json();
        if (monthlyData.success && monthlyData.data?.sessions?.length > 0) {
          reports.push({
            id: 'monthly-' + oneMonthAgo + '-' + today,
            type: 'monthly',
            date: `${oneMonthAgo} to ${today}`,
            isLatest: true,
            downloadUrl: '#',
            size: `${monthlyData.data.sessions.length} sessions`,
            sessions: monthlyData.data.sessions,
            summary: monthlyData.data.summary
          });
          console.log('✅ Monthly report loaded:', monthlyData.data.sessions.length, 'sessions');
        }
      }
      
      setAvailableReports(reports);
      console.log('📊 Generated engine sessions reports:', reports.length, 'types available');
      
    } catch (err) {
      console.error('Error fetching engine sessions reports:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch engine sessions reports');
      toast({
        title: 'Failed to load reports',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      if (!error) {
        toast({
          title: 'Engine sessions reports loaded',
          description: 'Daily, weekly, and monthly engine sessions have been fetched.'
        });
      }
    }
  };


  useEffect(() => {
    if (userCostCode || isAdmin) {
      fetchTheftData();
    }
  }, [userCostCode, isAdmin]);


  const getReportsByType = (type: 'daily' | 'weekly' | 'monthly') => {
    return (availableReports || []).filter(report => report.type === type);
  };

  const getLatestReportByType = (type: 'daily' | 'weekly' | 'monthly') => {
    const reports = getReportsByType(type);
    return reports.length > 0 ? reports[0] : null;
  };


  // Handle report view/download - show engine sessions data
  const handleDownloadReport = async (report: FuelReport) => {
    try {
      console.log('📊 Viewing engine sessions report:', report.type, report.date);
      
      if (report.sessions && report.sessions.length > 0) {
        // Create a summary of the engine sessions
        const summary = report.summary || {};
        const totalSessions = report.sessions.length;
        const totalHours = report.sessions.reduce((sum: number, session: any) => sum + (session.operating_hours || 0), 0);
        const totalFuelUsed = report.sessions.reduce((sum: number, session: any) => sum + (session.total_usage || 0), 0);
        
        // Show summary in a toast
        toast({
          title: `${report.type.charAt(0).toUpperCase() + report.type.slice(1)} Engine Sessions Report`,
          description: `${totalSessions} sessions, ${totalHours.toFixed(1)} hours, ${totalFuelUsed.toFixed(1)}L fuel used`
        });
        
        // Log detailed data to console for debugging
        console.log('📊 Engine Sessions Summary:', {
          type: report.type,
          date: report.date,
          totalSessions,
          totalHours: totalHours.toFixed(1),
          totalFuelUsed: totalFuelUsed.toFixed(1),
          sessions: report.sessions
        });
        
        // You could also open a modal or navigate to a detailed view here
        // For now, we'll just show the summary
        
      } else {
        toast({
          title: 'No Data Available',
          description: `No engine sessions found for ${report.type} report`,
          variant: 'destructive'
        });
      }
      
    } catch (error) {
      console.error('Error viewing report:', error);
      toast({
        title: 'Error',
        description: 'Failed to view report data',
        variant: 'destructive'
      });
    }
  };

  // Generate Excel report using the API
  const handleGenerateReport = async (reportType: 'daily' | 'weekly' | 'monthly') => {
    try {
      setLoading(true);
      
      const costCode = isAdmin ? null : userCostCode;
      
      if (!isAdmin && !userCostCode) {
        toast({
          title: 'Error',
          description: 'No cost code available for report generation',
          variant: 'destructive'
        });
        return;
      }
      
      console.log(`📊 Generating ${reportType} Excel report:`, isAdmin ? 'for all cost codes (admin)' : `for cost code: ${userCostCode}`);
      
      // Prepare request body
      const requestBody: any = {
        report_type: reportType
      };
      
      // Add cost_code if not admin
      if (costCode) {
        requestBody.cost_code = costCode;
      }
      
      // Add target_date for daily and monthly reports
      if (reportType === 'daily') {
        requestBody.target_date = new Date().toISOString().split('T')[0];
      } else if (reportType === 'monthly') {
        const firstDayOfMonth = new Date();
        firstDayOfMonth.setDate(1);
        requestBody.target_date = firstDayOfMonth.toISOString().split('T')[0];
      }
      
      const generateUrl = `http://${process.env.NEXT_PUBLIC_SERVER_URL}/api/energy-rite/reports/generate-excel`;
      
      const response = await fetch(generateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data?.download_url) {
          // Open the download URL
          window.open(result.data.download_url, '_blank');
          
          toast({
            title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report Generated`,
            description: `Excel report has been generated and downloaded successfully`
          });
          
          // Refresh the reports after generation
          setTimeout(() => {
            fetchTheftData();
          }, 1000);
          
        } else {
          throw new Error(result.message || 'Failed to generate report');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate report');
      }
      
    } catch (error) {
      console.error(`Error generating ${reportType} report:`, error);
      toast({
        title: 'Report Generation Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getBadgeColor = (type: 'daily' | 'weekly' | 'monthly') => {
    switch (type) {
      case 'daily': return 'bg-blue-100 text-blue-800';
      case 'weekly': return 'bg-green-100 text-green-800';
      case 'monthly': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCostCenterName = () => {
    if (userCostCode) {
      return `Cost Center: ${userCostCode}`;
    }
    return 'Reports';
  };

  const getBreadcrumbPath = () => {
    if (selectedRoute && 'name' in selectedRoute) {
      const costCenterName = selectedRoute.name as string;
      return `Macsteel > HARVEY ROOFING PRODUCTS - DIV OF MSCSA (PTY) LTD > ${costCenterName} - (COST CODE: ${selectedRoute.costCode || 'MACS-0001'})`;
    }
    return 'Macsteel > HARVEY ROOFING PRODUCTS - DIV OF MSCSA (PTY) LTD > TRUCKS - (COST CODE: MACS-0001)';
  };

  return (
    <div className="bg-gray-50 h-full">
      <TopNavigation />

      {/* Fuel Reports Section */}
      <div className="space-y-6 p-6">
        {/* Show reports for user's cost center or all reports for admin */}
        {(userCostCode || isAdmin) && (
          <>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Fuel className="w-6 h-6 text-gray-700" />
              <h2 className="font-semibold text-gray-900 text-2xl">Engine Sessions Reports</h2>
            </div>
            <Button variant="outline" size="sm" onClick={fetchTheftData}>
              <RefreshCw className="mr-2 w-4 h-4" />
              Refresh
            </Button>
          </div>
              <p className="text-gray-600 text-sm">
                Engine sessions {isAdmin ? 'across all cost codes (admin view)' : `filtered by cost code: ${userCostCode}`}
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Real-time engine ON/OFF events with fuel calculations
              </p>
        </div>

        {/* Reports Cards - Always show all three types */}
        <div className="gap-6 grid grid-cols-1 md:grid-cols-3">
          {/* Daily Report */}
          <Card className="shadow-sm border border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="font-semibold text-gray-900 text-lg">Daily Report</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {getLatestReportByType('daily') ? (
                <div className="flex justify-between items-center gap-3 hover:bg-gray-50 p-3 border border-gray-100 rounded cursor-pointer" onClick={() => handleDownloadReport(getLatestReportByType('daily')!)}>
                  <div className="flex items-center gap-3">
                    <Download className="w-5 h-5 text-blue-500" />
                    <div>
                      <span className="font-medium text-gray-700 text-sm">
                        {getLatestReportByType('daily')!.date}
                  </span>
                      {getLatestReportByType('daily')!.size && (
                        <span className="ml-2 text-gray-500 text-xs">({getLatestReportByType('daily')!.size})</span>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="hover:bg-blue-50 border-blue-200 text-blue-600">
                    View
                  </Button>
                </div>
              ) : (
                <div className="flex justify-center items-center p-6 text-gray-500">
                  <div className="text-center">
                    <Download className="mx-auto mb-2 w-8 h-8 text-gray-400" />
                  </div>
                </div>
              )}
              
              {/* Generate Report Button */}
              <div className="mt-4 pt-3 border-t">
                <Button 
                  onClick={() => handleGenerateReport('daily')}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  <Download className="mr-2 w-4 h-4" />
                  Download Report
                </Button>
                <p className="mt-2 text-center text-gray-500 text-xs">
                  Generate Excel report for today's data
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Report */}
          <Card className="shadow-sm border border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="font-semibold text-gray-900 text-lg">Weekly Report</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {getLatestReportByType('weekly') ? (
                <div className="flex justify-between items-center gap-3 hover:bg-gray-50 p-3 border border-gray-100 rounded cursor-pointer" onClick={() => handleDownloadReport(getLatestReportByType('weekly')!)}>
                  <div className="flex items-center gap-3">
                    <Download className="w-5 h-5 text-green-500" />
                    <div>
                      <span className="font-medium text-gray-700 text-sm">
                        {getLatestReportByType('weekly')!.date}
                  </span>
                      {getLatestReportByType('weekly')!.size && (
                        <span className="ml-2 text-gray-500 text-xs">({getLatestReportByType('weekly')!.size})</span>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="hover:bg-green-50 border-green-200 text-green-600">
                    View
                  </Button>
                </div>
              ) : (
                <div className="flex justify-center items-center p-6 text-gray-500">
                  <div className="text-center">
                    <Download className="mx-auto mb-2 w-8 h-8 text-gray-400" />
                  </div>
                </div>
              )}
              
              {/* Generate Report Button */}
              <div className="mt-4 pt-3 border-t">
                <Button 
                  onClick={() => handleGenerateReport('weekly')}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <Download className="mr-2 w-4 h-4" />
                  Download Report
                </Button>
                <p className="mt-2 text-center text-gray-500 text-xs">
                  Generate Excel report for last 7 days
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Report */}
          <Card className="shadow-sm border border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="font-semibold text-gray-900 text-lg">Monthly Report</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {getLatestReportByType('monthly') ? (
                <div className="flex justify-between items-center gap-3 hover:bg-gray-50 p-3 border border-gray-100 rounded cursor-pointer" onClick={() => handleDownloadReport(getLatestReportByType('monthly')!)}>
                  <div className="flex items-center gap-3">
                    <Download className="w-5 h-5 text-purple-500" />
                    <div>
                      <span className="font-medium text-gray-700 text-sm">
                        {getLatestReportByType('monthly')!.date}
                  </span>
                      {getLatestReportByType('monthly')!.size && (
                        <span className="ml-2 text-gray-500 text-xs">({getLatestReportByType('monthly')!.size})</span>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="hover:bg-purple-50 border-purple-200 text-purple-600">
                    View
                  </Button>
                </div>
              ) : (
                <div className="flex justify-center items-center p-6 text-gray-500">
                  <div className="text-center">
                    <Download className="mx-auto mb-2 w-8 h-8 text-gray-400" />
                  </div>
                </div>
              )}
              
              {/* Generate Report Button */}
              <div className="mt-4 pt-3 border-t">
                <Button 
                  onClick={() => handleGenerateReport('monthly')}
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  size="sm"
                >
                  <Download className="mr-2 w-4 h-4" />
                  Download Report
                </Button>
                <p className="mt-2 text-center text-gray-500 text-xs">
                  Generate Excel report for current month
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
          </>
        )}

        {/* Show message if no cost code available and not admin */}
        {!userCostCode && !isAdmin && (
          <Card className="shadow-sm border border-gray-200">
            <CardContent className="flex justify-center items-center py-12">
              <div className="text-center">
                <Fuel className="mx-auto mb-4 w-16 h-16 text-gray-400" />
                <p className="font-medium text-gray-500 text-lg">No Cost Code Available</p>
                <p className="mt-2 text-gray-400 text-sm">
                  Please ensure you are logged in with a valid cost code to view reports
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
