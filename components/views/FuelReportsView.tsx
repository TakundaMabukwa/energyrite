'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TopNavigation } from '@/components/layout/TopNavigation';
import { Download, Fuel, RefreshCw, FileX, Plus, Calendar } from 'lucide-react';
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
  const { userCostCode, userSiteId, isAdmin } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theftStats, setTheftStats] = useState<TheftStatistics | null>(null);
  const [vehiclesWithTheft, setVehiclesWithTheft] = useState<VehicleWithTheft[]>([]);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [availableReports, setAvailableReports] = useState<FuelReport[]>([]);
  const [reportDocuments, setReportDocuments] = useState<ReportDocument[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('day');

  // No need to fetch pre-made reports - we generate them on demand
      



  useEffect(() => {
    setLoading(false);
  }, []);


  const getReportsByType = (type: 'daily' | 'weekly' | 'monthly') => {
    return (availableReports || []).filter(report => report.type === type);
  };

  const getLatestReportByType = (type: 'daily' | 'weekly' | 'monthly') => {
    const reports = getReportsByType(type);
    return reports.length > 0 ? reports[0] : null;
  };




  // Generate Excel report with date selection
  const handleGenerateCustomReport = async () => {
    try {
      setLoading(true);
      
      // Priority: site_id > selectedRoute.costCode > userCostCode
      let costCode = selectedRoute?.costCode || userCostCode || null;
      let siteId = userSiteId || null;
      
      const requestBody = {
        report_type: selectedPeriod === 'day' ? 'daily' : selectedPeriod === 'week' ? 'weekly' : 'monthly',
        date: selectedDate,
        start_date: selectedDate,
        end_date: selectedDate,
        target_date: selectedDate,
        ...(siteId && { site_id: siteId }),
        ...(costCode && !siteId && { cost_code: costCode })
      };
      
      console.log('🗓️ Custom Report Request:', {
        selectedDate,
        selectedPeriod,
        requestBody,
        apiUrl: `http://${process.env.NEXT_PUBLIC_API_HOST}:${process.env.NEXT_PUBLIC_API_PORT}/api/energy-rite/excel-reports/generate`
      });
      
      const apiUrl = `http://${process.env.NEXT_PUBLIC_API_HOST}:${process.env.NEXT_PUBLIC_API_PORT}/api/energy-rite/excel-reports/generate`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('📡 Custom Report Response Status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to generate report: ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log('📊 Custom Report Response Data:', data);
      console.log('🔍 API Response Details:', {
        success: data.success,
        message: data.message,
        filename: data.data?.file_name,
        downloadUrl: data.data?.download_url,
        dataCount: data.data?.total_records || 'unknown',
        dateRange: data.data?.date_range || 'unknown'
      });
      
      if (!data.success || !data.data?.download_url) {
        throw new Error(data.message || 'Failed to generate Excel report');
      }
      
      window.open(data.data.download_url, '_blank');
      
      toast({
        title: `${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}ly Report Ready`,
        description: `File: ${data.data.file_name} for ${selectedDate} - Click to download`
      });
      
    } catch (error) {
      console.error(`Error generating report:`, error);
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
          errorMessage = `API server not accessible at ${process.env.NEXT_PUBLIC_API_HOST}:${process.env.NEXT_PUBLIC_API_PORT}. Please check if the server is running.`;
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: 'Report Request Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate Excel report using new endpoints
  const handleGenerateReport = async (reportType: 'daily' | 'weekly' | 'monthly') => {
    try {
      setLoading(true);
      
      console.log('🔍 Debug values:', {
        isAdmin,
        selectedRoute,
        userCostCode,
        'selectedRoute?.costCode': selectedRoute?.costCode
      });
      
      // Priority: site_id > selectedRoute.costCode > userCostCode
      let costCode = selectedRoute?.costCode || userCostCode || null;
      let siteId = userSiteId || null;
      
      console.log('📊 Excel Report - Final cost code:', costCode);
      console.log('📊 Excel Report - Site ID:', siteId);
      console.log('📊 Excel Report - Report type:', reportType);
      
      const requestBody = {
        report_type: reportType,
        ...(siteId && { site_id: siteId }),
        ...(costCode && !siteId && { cost_code: costCode })
      };
      
      console.log('📊 Request body:', requestBody);
      
      const apiUrl = `http://${process.env.NEXT_PUBLIC_API_HOST}:${process.env.NEXT_PUBLIC_API_PORT}/api/energy-rite/excel-reports/generate`;
      console.log('🌐 API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('📡 Excel response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to generate report: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success || !data.data?.download_url) {
        throw new Error(data.message || 'Failed to generate Excel report');
      }
      
      // Open the download URL
      window.open(data.data.download_url, '_blank');
      
      toast({
        title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Excel Report Ready`,
        description: `File: ${data.data.file_name} - Click to download`
      });
      
    } catch (error) {
      console.error(`Error generating or downloading ${reportType} report:`, error);
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
          errorMessage = `API server not accessible at ${process.env.NEXT_PUBLIC_API_HOST}:${process.env.NEXT_PUBLIC_API_PORT}. Please check if the server is running.`;
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: 'Report Request Failed',
        description: errorMessage,
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

          </div>
              <p className="text-gray-600 text-sm">
                Engine sessions {isAdmin ? 'across all cost codes (admin view)' : `filtered by cost code: ${userCostCode}`}
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Real-time engine ON/OFF events with fuel calculations
              </p>
        </div>

        {/* Custom Report Generator */}
        <Card className="shadow-sm border border-gray-200 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="font-semibold text-gray-900 text-lg">Custom Report Generator</CardTitle>
            <p className="text-gray-600 text-sm">Select date and period to generate a custom report</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <label className="text-sm font-medium text-gray-700">Date:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Period:</label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value as 'day' | 'week' | 'month')}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="day">Daily</option>
                  <option value="week">Weekly</option>
                  <option value="month">Monthly</option>
                </select>
              </div>
              <Button 
                onClick={handleGenerateCustomReport}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Download className="mr-2 w-4 h-4" />
                {loading ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </CardContent>
        </Card>

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
              <div className="text-center py-6">
                <Download className="mx-auto mb-4 w-12 h-12 text-blue-500" />
                <p className="mb-4 text-gray-600 text-sm">Generate daily Excel report</p>
                <Button 
                  onClick={() => handleGenerateReport('daily')}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Download className="mr-2 w-4 h-4" />
                  Generate Daily Report
                </Button>
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
              <div className="text-center py-6">
                <Download className="mx-auto mb-4 w-12 h-12 text-green-500" />
                <p className="mb-4 text-gray-600 text-sm">Generate weekly Excel report</p>
                <Button 
                  onClick={() => handleGenerateReport('weekly')}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <Download className="mr-2 w-4 h-4" />
                  Generate Weekly Report
                </Button>
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
              <div className="text-center py-6">
                <Download className="mx-auto mb-4 w-12 h-12 text-purple-500" />
                <p className="mb-4 text-gray-600 text-sm">Generate monthly Excel report</p>
                <Button 
                  onClick={() => handleGenerateReport('monthly')}
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Download className="mr-2 w-4 h-4" />
                  Generate Monthly Report
                </Button>
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
