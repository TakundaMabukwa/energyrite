'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Download, Fuel, RefreshCw, AlertTriangle, Shield, FileX } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
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
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theftStats, setTheftStats] = useState<TheftStatistics | null>(null);
  const [vehiclesWithTheft, setVehiclesWithTheft] = useState<VehicleWithTheft[]>([]);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [availableReports, setAvailableReports] = useState<FuelReport[]>([]);
  const [reportDocuments, setReportDocuments] = useState<ReportDocument[]>([]);

  // Fetch fuel theft data and reports from Energy Rite server
  const fetchTheftData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters based on selected cost center
      const buildUrl = (endpoint: string) => {
        let url = `/api/energy-rite-proxy?endpoint=${endpoint}`;
        
        if (selectedRoute && ('costCode' in selectedRoute || 'branch' in selectedRoute)) {
          // Use query parameters for filtering (most reliable approach)
          const params = new URLSearchParams();
          if (selectedRoute.costCode) {
            params.append('costCenterId', selectedRoute.costCode);
          }
          if (selectedRoute.company) {
            params.append('company', selectedRoute.company);
          }
          if (selectedRoute.branch) {
            params.append('branch', selectedRoute.branch);
          }
          
          if (params.toString()) {
            url += `&${params.toString()}`;
          }
          console.log('🔍 Using query parameters for fuel reports:', url);
        }
        
        return url;
      };
      
      // Fetch daily report for today (summary)
      const today = new Date().toISOString().slice(0, 10);
      const dashboardResponse = await fetch(buildUrl(`/api/energy-rite/reports/daily-report?date=${today}`));
      if (dashboardResponse.ok) {
        const dashboardResult = await dashboardResponse.json();
        if (dashboardResult.success && dashboardResult.data) {
          setReportData(dashboardResult.data);
          console.log('📊 Report data loaded:', dashboardResult.data);
        }
      }

      // Fetch anomalies (treated as theft statistics proxy)
      const statsResponse = await fetch(buildUrl('/api/energy-rite/fuel-analysis/anomalies'));
      if (statsResponse.ok) {
        const statsResult = await statsResponse.json();
        if (statsResult.success) {
          // Map anomalies response to theft stats shape
          const anomalies = Array.isArray(statsResult.data?.anomalies) ? statsResult.data.anomalies : [];
          setTheftStats({
            total_vehicles: reportData?.statistics ? parseInt(reportData.statistics.total_vehicles || '0') : 0,
            vehicles_with_theft: anomalies.length,
            total_theft_incidents: anomalies.length,
            theft_rate_percentage: 0,
            recent_theft_incidents: anomalies.slice(0, 10).map((a: any) => ({
              plate: a.plate || a.id,
              branch: a.branch,
              theft_time: a.detected_at,
              fuel_drop: Math.abs(a.fuel_difference || 0),
              time_window: 'N/A'
            }))
          });
        }
      }

      // Fetch vehicles list to correlate with anomalies (fallback to vehicles endpoint)
      const vehiclesResponse = await fetch(buildUrl('/api/energy-rite/vehicles'));
      if (vehiclesResponse.ok) {
        const vehiclesResult = await vehiclesResponse.json();
        if (vehiclesResult.success) {
          const list = Array.isArray(vehiclesResult.data?.vehicles) ? vehiclesResult.data.vehicles : (Array.isArray(vehiclesResult.data) ? vehiclesResult.data : []);
          setVehiclesWithTheft(list.slice(0, 50).map((v: any) => ({
            plate: v.plate || v.vehicle_plate || v.id,
            branch: v.branch,
            company: v.company,
            fuel_anomaly: v.fuel_anomaly || '',
            fuel_anomaly_note: v.notes || '',
            theft_time: v.theft_time || v.last_message_date,
            last_message_date: v.last_message_date
          })));
        }
      }

      // Build available report documents using generate endpoints
      const reportDocsResponse = await fetch('/api/energy-rite-proxy?endpoint=/api/energy-rite/reports/monthly-report/generate');
      if (reportDocsResponse.ok) {
        const reportDocsResult = await reportDocsResponse.json();
        console.log('📄 Report documents API response:', reportDocsResult);
        
        if (reportDocsResult.success) {
          // create synthetic documents from summary responses
          const today = new Date();
          const month = String(today.getMonth() + 1);
          const year = String(today.getFullYear());
          setReportDocuments([
            { id: 'daily', name: 'Daily Report', type: 'daily', date: today.toISOString().slice(0,10), size: '—', downloadUrl: `/api/energy-rite/reports/daily-report?date=${today.toISOString().slice(0,10)}`, createdAt: today.toISOString() },
            { id: 'monthly', name: 'Monthly Report', type: 'monthly', date: `${month}/${year}`, size: '—', downloadUrl: `/api/energy-rite/reports/monthly-report/generate?month=${month}&year=${year}`, createdAt: today.toISOString() }
          ] as any);
          console.log('✅ Report documents synthesized');
        } else {
          console.log('⚠️ No report documents found in API response');
          setReportDocuments([]);
        }
      } else {
        console.log('⚠️ Failed to fetch report documents, status:', reportDocsResponse.status);
        setReportDocuments([]);
      }

      // Generate available reports based on current data
      generateAvailableReports();
    } catch (err) {
      console.error('Error fetching theft data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch theft data');
      toast({
        title: 'Failed to load reports',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      if (!error) {
        toast({
          title: 'Reports loaded',
          description: 'Latest reports and anomalies have been fetched.'
        });
      }
    }
  };

  // Generate available reports based on current data and selected cost center
  const generateAvailableReports = () => {
    // Get the cost code from selected route
    const costCode = selectedRoute && 'costCode' in selectedRoute ? selectedRoute.costCode : null;
    
    // If we have real report documents from the API, filter by cost code
    if (reportDocuments && reportDocuments.length > 0) {
      let filteredDocs = reportDocuments;
      
      if (costCode) {
        // Filter reports by cost code
        filteredDocs = reportDocuments.filter(doc => doc.cost_code === costCode);
        console.log('📄 Filtering reports for cost code:', costCode, '- Found:', filteredDocs.length, 'reports');
      } else {
        console.log('📄 No cost code selected, showing all reports:', reportDocuments.length, 'reports');
      }
      
      const reports: FuelReport[] = filteredDocs.map((doc, index) => ({
        id: doc.id,
        type: doc.type,
        date: doc.date,
        isLatest: index === 0, // Assume first document is latest
        downloadUrl: doc.downloadUrl,
        size: doc.size
      }));
      
      setAvailableReports(reports);
      console.log('📊 Using real report documents:', reports.length, 'reports');
      return;
    }
    
    // Fallback to mock data if no real documents available
    const today = new Date();
    const reports: FuelReport[] = [
      {
        id: 'daily-1',
        type: 'daily',
        date: today.toLocaleDateString(),
        isLatest: true,
        downloadUrl: '/api/energy-rite-reports/daily',
        size: '2.3 MB'
      },
      {
        id: 'daily-2',
        type: 'daily',
        date: new Date(today.getTime() - 24 * 60 * 60 * 1000).toLocaleDateString(),
        isLatest: false,
        downloadUrl: '/api/energy-rite-reports/daily',
        size: '2.1 MB'
      },
      {
        id: 'weekly-1',
        type: 'weekly',
        date: `Week of ${new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}`,
        isLatest: true,
        downloadUrl: '/api/energy-rite-reports/weekly',
        size: '15.7 MB'
      },
      {
        id: 'weekly-2',
        type: 'weekly',
        date: `Week of ${new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}`,
        isLatest: false,
        downloadUrl: '/api/energy-rite-reports/weekly',
        size: '14.2 MB'
      },
      {
        id: 'monthly-1',
        type: 'monthly',
        date: today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        isLatest: true,
        downloadUrl: '/api/energy-rite-reports/monthly',
        size: '67.4 MB'
      },
      {
        id: 'monthly-2',
        type: 'monthly',
        date: new Date(today.getFullYear(), today.getMonth() - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        isLatest: false,
        downloadUrl: '/api/energy-rite-reports/monthly',
        size: '58.9 MB'
      }
    ];
    
    setAvailableReports(reports);
    console.log('📊 Using fallback mock reports:', reports.length, 'reports');
  };

  useEffect(() => {
    fetchTheftData();
  }, [selectedRoute]);

  // Update available reports when report documents or selected route change
  useEffect(() => {
    generateAvailableReports();
  }, [reportDocuments, selectedRoute]);

  const getReportsByType = (type: 'daily' | 'weekly' | 'monthly') => {
    return (availableReports || []).filter(report => report.type === type);
  };

  const getLatestReportByType = (type: 'daily' | 'weekly' | 'monthly') => {
    const reports = getReportsByType(type);
    return reports.length > 0 ? reports[0] : null;
  };

  // Handle report download
  const handleDownloadReport = async (report: FuelReport) => {
    try {
      console.log('📥 Downloading report:', report.type, report.date);
      
      // Use the download URL from the report document
      let downloadUrl = report.downloadUrl;
      
      // If it's a relative URL, make it absolute via proxy
      if (downloadUrl.startsWith('/')) {
        downloadUrl = `/api/energy-rite-proxy?endpoint=${downloadUrl}`;
      }
      
      // Add cost center filtering if applicable
      if (selectedRoute && ('costCode' in selectedRoute || 'branch' in selectedRoute)) {
        const params = new URLSearchParams();
        if (selectedRoute.costCode) {
          params.append('costCenterId', selectedRoute.costCode);
        }
        if (selectedRoute.company) {
          params.append('company', selectedRoute.company);
        }
        if (selectedRoute.branch) {
          params.append('branch', selectedRoute.branch);
        }
        
        if (params.toString()) {
          downloadUrl += (downloadUrl.includes('?') ? '&' : '?') + params.toString();
        }
      }
      
      console.log('🔗 Download URL:', downloadUrl);
      
      // Create a temporary link element for download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${report.type}-report-${report.date.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
      link.target = '_blank';
      
      // Add to DOM, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ Download initiated for:', report.type, 'report');
      
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report. Please try again.');
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
    if (selectedRoute && 'name' in selectedRoute) {
      return selectedRoute.name as string;
    }
    return 'Cost Centre (151)';
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
      {/* Header */}
      <div className="bg-white p-6 border-gray-200 border-b">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="mr-2 w-4 h-4" />
              Back to Cost Centers
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={fetchTheftData}>
              <RefreshCw className="mr-2 w-4 h-4" />
              Refresh
            </Button>
            {theftStats && (
              <div className="text-gray-500 text-sm">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
        <div className="mt-2">
            <h1 className="font-semibold text-blue-600 text-2xl">{getCostCenterName()}</h1>
        </div>
      </div>

      {/* Fuel Reports Section */}
      <div className="space-y-6 p-6">
        {/* Theft Statistics Cards */}
        {theftStats && (
          <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="font-bold text-gray-900 text-2xl">{theftStats.total_vehicles || 0}</p>
                    <p className="text-gray-600 text-sm">Total Vehicles</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                  <div>
                    <p className="font-bold text-gray-900 text-2xl">{theftStats.vehicles_with_theft || 0}</p>
                    <p className="text-gray-600 text-sm">Vehicles with Theft</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-orange-500" />
                  <div>
                    <p className="font-bold text-gray-900 text-2xl">{theftStats.total_theft_incidents || 0}</p>
                    <p className="text-gray-600 text-sm">Total Incidents</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-purple-500" />
                  <div>
                    <p className="font-bold text-gray-900 text-2xl">{(theftStats.theft_rate_percentage || 0).toFixed(1)}%</p>
                    <p className="text-gray-600 text-sm">Theft Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Theft Incidents */}
        {theftStats && theftStats.recent_theft_incidents && theftStats.recent_theft_incidents.length > 0 && (
          <Card className="shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-semibold text-gray-900 text-xl">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Recent Theft Incidents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-red-50 text-red-800">
                    <tr>
                      <th className="px-6 py-4 font-medium text-sm text-left">Plate</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Branch</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Fuel Drop</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Time Window</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {theftStats.recent_theft_incidents.map((incident, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 font-medium text-gray-900 text-sm">{incident.plate}</td>
                        <td className="px-6 py-4 text-gray-900 text-sm">{incident.branch}</td>
                        <td className="px-6 py-4 font-medium text-red-600 text-sm">{incident.fuel_drop}L</td>
                        <td className="px-6 py-4 text-gray-900 text-sm">{incident.time_window}</td>
                        <td className="px-6 py-4 text-gray-900 text-sm">
                          {new Date(incident.theft_time).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vehicles with Theft Flags */}
        {vehiclesWithTheft && vehiclesWithTheft.length > 0 && (
          <Card className="shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-semibold text-gray-900 text-xl">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Vehicles with Theft Flags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-orange-50 text-orange-800">
                    <tr>
                      <th className="px-6 py-4 font-medium text-sm text-left">Plate</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Branch</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Company</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Anomaly</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Note</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {vehiclesWithTheft.map((vehicle, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 font-medium text-gray-900 text-sm">{vehicle.plate}</td>
                        <td className="px-6 py-4 text-gray-900 text-sm">{vehicle.branch}</td>
                        <td className="px-6 py-4 text-gray-900 text-sm">{vehicle.company}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="bg-orange-100 px-2 py-1 rounded-full text-orange-800 text-xs">
                            {vehicle.fuel_anomaly}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-900 text-sm">{vehicle.fuel_anomaly_note}</td>
                        <td className="px-6 py-4 text-sm">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              // Reset theft flag - would need to implement API call
                              console.log('Reset theft flag for:', vehicle.plate);
                            }}
                          >
                            Reset Flag
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}


        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Fuel className="w-6 h-6 text-gray-700" />
            <h2 className="font-semibold text-gray-900 text-2xl">Available Reports</h2>
          </div>
        </div>

        {/* Reports Cards - Always show all three types */}
        <div className="gap-6 grid grid-cols-1 md:grid-cols-3">
          {/* Daily Report */}
          <Card className="shadow-sm border border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="font-semibold text-gray-900 text-lg">Daily Report</CardTitle>
                {getLatestReportByType('daily') ? (
                <Badge className={`${getBadgeColor('daily')} px-3 py-1`}>
                    Latest
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 px-3 py-1 text-gray-600">
                    Not Available
                </Badge>
                )}
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
                    Download
                  </Button>
                </div>
              ) : (
                <div className="flex justify-center items-center p-6 text-gray-500">
                  <div className="text-center">
                    <FileX className="mx-auto mb-2 w-8 h-8 text-gray-400" />
                    <p className="text-sm">No daily reports available</p>
                    {selectedRoute && 'costCode' in selectedRoute && (
                      <p className="mt-1 text-xs">for cost center: {selectedRoute.costCode}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weekly Report */}
          <Card className="shadow-sm border border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="font-semibold text-gray-900 text-lg">Weekly Report</CardTitle>
                {getLatestReportByType('weekly') ? (
                <Badge className={`${getBadgeColor('weekly')} px-3 py-1`}>
                    Latest
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 px-3 py-1 text-gray-600">
                    Not Available
                </Badge>
                )}
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
                    Download
                  </Button>
                </div>
              ) : (
                <div className="flex justify-center items-center p-6 text-gray-500">
                  <div className="text-center">
                    <FileX className="mx-auto mb-2 w-8 h-8 text-gray-400" />
                    <p className="text-sm">No weekly reports available</p>
                    {selectedRoute && 'costCode' in selectedRoute && (
                      <p className="mt-1 text-xs">for cost center: {selectedRoute.costCode}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Report */}
          <Card className="shadow-sm border border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="font-semibold text-gray-900 text-lg">Monthly Report</CardTitle>
                {getLatestReportByType('monthly') ? (
                <Badge className={`${getBadgeColor('monthly')} px-3 py-1`}>
                    Latest
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 px-3 py-1 text-gray-600">
                    Not Available
                </Badge>
                )}
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
                    Download
                  </Button>
                </div>
              ) : (
                <div className="flex justify-center items-center p-6 text-gray-500">
                  <div className="text-center">
                    <FileX className="mx-auto mb-2 w-8 h-8 text-gray-400" />
                    <p className="text-sm">No monthly reports available</p>
                    {selectedRoute && 'costCode' in selectedRoute && (
                      <p className="mt-1 text-xs">for cost center: {selectedRoute.costCode}</p>
                    )}
                </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Show No Reports Message only if no reports at all */}
        {(!availableReports || availableReports.length === 0) && (
          <Card className="shadow-sm border border-gray-200">
            <CardContent className="flex justify-center items-center py-12">
              <div className="text-center">
                <Fuel className="mx-auto mb-4 w-16 h-16 text-gray-400" />
                <p className="font-medium text-gray-500 text-lg">No reports available</p>
                <p className="mt-2 text-gray-400 text-sm">
                  {selectedRoute && (selectedRoute as any).costCode ? 
                    `No reports found for cost center: ${(selectedRoute as any).costCode}` :
                    'No reports are currently available for download'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
