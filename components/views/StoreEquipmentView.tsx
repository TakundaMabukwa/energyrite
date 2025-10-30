'use client';

import React, { useState, useEffect } from 'react';
import { HierarchicalTable } from '@/components/ui/hierarchical-table';
import { TopNavigation } from '@/components/layout/TopNavigation';
import { useApp } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Activity, Fuel, AlertTriangle, Clock, Wifi, Building2, PenSquare, Save, X, PlusCircle, Trash2 } from 'lucide-react';
import { HierarchicalCostCenter } from '@/lib/supabase/cost-centers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface RealtimeDashboardData {
  statistics?: {
    total_vehicles?: string;
    theft_incidents?: string;
    vehicles_with_fuel_data?: string;
    total_volume_capacity?: string;
  };
  recentThefts?: any[];
  companyBreakdown?: any[];
  branchBreakdown?: any[];
}

interface VehicleEquipment {
  id: number;
  branch: string;
  company: string;
  plate: string | null;
  ip_address: string;
  cost_code: string;
  speed: string;
  latitude: string;
  longitude: string;
  loctime: string;
  quality: string;
  mileage: string;
  pocsagstr: string | null;
  head: string | null;
  geozone: string;
  drivername: string | null;
  nameevent: string | null;
  temperature: string;
  address: string;
  fuel_probe_1_level: string;
  fuel_probe_1_volume_in_tank: string;
  fuel_probe_1_temperature: string;
  fuel_probe_1_level_percentage: string;
  fuel_probe_2_level: string | null;
  fuel_probe_2_volume_in_tank: string | null;
  fuel_probe_2_temperature: string | null;
  fuel_probe_2_level_percentage: string | null;
  status: string | null;
  last_message_date: string;
  updated_at: string;
  volume: string;
  theft: boolean;
  theft_time: string | null;
  previous_fuel_level: string | null;
  previous_fuel_time: string | null;
  activity_start_time: string | null;
  activity_duration_hours: string | null;
  total_usage_hours: string;
  daily_usage_hours: string;
  is_active: boolean;
  last_activity_time: string | null;
  fuel_anomaly: string | null;
  fuel_anomaly_note: string | null;
  last_anomaly_time: string | null;
  created_at: string;
  notes?: string | null;
}

export function StoreEquipmentView() {
  const { costCenters, setSelectedRoute, activeTab, selectedRoute, vehicles } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [showVehicles, setShowVehicles] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeData, setRealtimeData] = useState<RealtimeDashboardData | null>(null);
  const [filteredRealtimeData, setFilteredRealtimeData] = useState<RealtimeDashboardData | null>(null);
  const [equipmentData, setEquipmentData] = useState<VehicleEquipment[]>([]);
  const [equipmentLoading, setEquipmentLoading] = useState(false);
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editedEquipment, setEditedEquipment] = useState<VehicleEquipment | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Add generator dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newGenerator, setNewGenerator] = useState<Partial<VehicleEquipment>>({
    branch: '',
    company: '',
    cost_code: '',
    ip_address: '',
    notes: '',
    is_active: true,
  });
  const { toast } = useToast();

  // Fetch real-time dashboard data (same as dashboard)
  const fetchRealtimeData = async (costCenter?: HierarchicalCostCenter) => {
    try {
      setLoading(true);
      setError(null);
      
      let url = `http://${process.env.NEXT_PUBLIC_SERVER_URL}/api/energy-rite-reports/realtime-dashboard`;
      
      // Add cost center specific parameters if provided
      if (costCenter) {
        const params = new URLSearchParams();
        if (costCenter.company) {
          params.append('company', costCenter.company);
        }
        if (costCenter.branch) {
          params.append('branch', costCenter.branch);
        }
        if (costCenter.costCode) {
          params.append('costCenterId', costCenter.costCode);
        }
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn('Realtime dashboard endpoint returned non-OK status:', response.status);
        const fallbackData = {
          statistics: {
            total_vehicles: '0',
            theft_incidents: '0',
            vehicles_with_fuel_data: '0',
            total_volume_capacity: '0.00'
          }
        };
        if (costCenter) {
          setFilteredRealtimeData(fallbackData);
        } else {
          setRealtimeData(fallbackData);
        }
        return;
      }
      
      let result: any = null;
      try {
        result = await response.json();
      } catch (e) {
        console.warn('Failed to parse realtime dashboard JSON. Using fallback.');
        const fallbackData = {
          statistics: {
            total_vehicles: '0',
            theft_incidents: '0',
            vehicles_with_fuel_data: '0',
            total_volume_capacity: '0.00'
          }
        };
        if (costCenter) {
          setFilteredRealtimeData(fallbackData);
        } else {
          setRealtimeData(fallbackData);
        }
        return;
      }
      
      if (result.success && result.data) {
        if (costCenter) {
          setFilteredRealtimeData(result.data);
        } else {
          setRealtimeData(result.data);
        }
      } else {
        // Set fallback data if API response is not in expected format
        const fallbackData = {
          statistics: {
            total_vehicles: '0',
            theft_incidents: '0',
            vehicles_with_fuel_data: '0',
            total_volume_capacity: '0.00'
          }
        };
        
        if (costCenter) {
          setFilteredRealtimeData(fallbackData);
        } else {
          setRealtimeData(fallbackData);
        }
      }
    } catch (err) {
      console.error('Error fetching real-time data:', err);
      setError('Failed to fetch real-time data');
      
      // Set fallback data on error
      const fallbackData = {
        statistics: {
          total_vehicles: '0',
          theft_incidents: '0',
          vehicles_with_fuel_data: '0',
          total_volume_capacity: '0.00'
        }
      };
      
      if (costCenter) {
        setFilteredRealtimeData(fallbackData);
      } else {
        setRealtimeData(fallbackData);
      }
    } finally {
      setLoading(false);
    }
  };

  // Load equipment data once from the API endpoint
  const fetchEquipmentData = async () => {
    try {
      setEquipmentLoading(true);
      // Filter by selected cost center if available
      const costCode = selectedRoute?.costCode;
      const url = costCode 
        ? `http://64.227.138.235:3000/api/energy-rite/vehicles?limit=500&cost_code=${costCode}`
        : `http://64.227.138.235:3000/api/energy-rite/vehicles?limit=500`;
      
      const resp = await fetch(url);
      
      if (!resp.ok) {
        throw new Error(`Failed to fetch equipment data: ${resp.status}`);
      }
      
      const json = await resp.json();
      const rows = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);

      const equipment: VehicleEquipment[] = rows.map((row: any) => row as VehicleEquipment);
      console.log('Fetched equipment data:', equipment.length, 'items');
      setEquipmentData(equipment);
    } catch (error) {
      console.error('❌ Error fetching equipment data:', error);
      toast({
        title: "Error fetching equipment data",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
      setEquipmentData([]);
    } finally {
      setEquipmentLoading(false);
    }
  };
  
  // Toggle row editing mode
  const handleEditEquipment = (equipment: VehicleEquipment) => {
    if (editingRowId === equipment.id) {
      // If already editing this row, cancel editing
      setEditingRowId(null);
      setEditedEquipment(null);
    } else {
      // Start editing this row
      setEditingRowId(equipment.id);
      setEditedEquipment({ ...equipment });
    }
  };
  
  // Handle equipment deletion
  const handleDeleteEquipment = async (equipment: VehicleEquipment) => {
    if (!equipment.id) {
      toast({
        title: "Error",
        description: "Cannot delete: Missing equipment ID",
        variant: "destructive"
      });
      return;
    }
    
    if (confirm(`Are you sure you want to delete ${equipment.branch}?`)) {
      try {
        const response = await fetch(`http://64.227.138.235:3000/api/energy-rite/vehicles/${equipment.id}?confirm=true`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error(`Failed to delete: ${response.status}`);
        }
        
        toast({
          title: "Equipment Deleted",
          description: `${equipment.branch} has been successfully removed`,
        });
        
        // Refresh equipment data to update the table
        await fetchEquipmentData();
      } catch (error) {
        console.error('Error deleting equipment:', error);
        toast({
          title: "Error Deleting Equipment",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          variant: "destructive"
        });
      }
    }
  };
  
  // Handle input changes in editable fields
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    if (!editedEquipment) return;
    
    setEditedEquipment({
      ...editedEquipment,
      [fieldName]: e.target.value
    });
  };
  
  // Handle saving equipment changes
  const handleSaveEquipment = async (equipment: VehicleEquipment) => {
    if (!editedEquipment) return;
    
    try {
      setIsSaving(true);
      
      // Prepare payload with only the fields we want to update
      const updatePayload = {
        branch: editedEquipment.branch,
        company: editedEquipment.company,
        cost_code: editedEquipment.cost_code,
        ip_address: editedEquipment.ip_address,
        notes: editedEquipment.notes
      };
      
      // Use the correct API URL as shown in the curl examples
      const response = await fetch(`http://64.227.138.235:3000/api/energy-rite/vehicles/${editedEquipment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update equipment: ${response.status}`);
      }
      
      // Get the response data
      const responseData = await response.json();
      console.log('Update response:', responseData);
      
      // Update the local state with the updated equipment
      setEquipmentData(prev => 
        prev.map(item => 
          item.id === editedEquipment.id ? {
            ...item,
            branch: editedEquipment.branch,
            company: editedEquipment.company,
            cost_code: editedEquipment.cost_code,
            ip_address: editedEquipment.ip_address,
            notes: editedEquipment.notes
          } : item
        )
      );
      
      toast({
        title: "Equipment updated",
        description: `Equipment for ${editedEquipment.branch} has been updated successfully.`,
      });
      
      // Exit edit mode
      setEditingRowId(null);
      setEditedEquipment(null);
    } catch (error) {
      console.error('Error updating equipment:', error);
      toast({
        title: "Error updating equipment",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Cancel editing
  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditedEquipment(null);
  };
  
  // Handle input change for new generator form
  const handleNewGeneratorChange = (field: keyof VehicleEquipment, value: string) => {
    setNewGenerator(prev => ({ ...prev, [field]: value }));
  };
  
  // Add new generator
  const handleAddGenerator = async () => {
    try {
      setIsSaving(true);
      
      // Validate required field (only branch is required according to API)
      if (!newGenerator.branch) {
        toast({
          title: "Validation Error",
          description: "Branch name is required",
          variant: "destructive"
        });
        return;
      }
      
      // Create the payload for the API - include all available fields
      const payload = {
        branch: newGenerator.branch,
        company: newGenerator.company || '',
        cost_code: newGenerator.cost_code || '',
        ip_address: newGenerator.ip_address || '',
        notes: newGenerator.notes || '',
        is_active: newGenerator.is_active === undefined ? true : newGenerator.is_active
      };
      
      // Send the request to create a new generator
      const response = await fetch('http://64.227.138.235:3000/api/energy-rite/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to add generator: ${response.status}`);
      }
      
      // Get the response data
      const responseData = await response.json();
      console.log('Generator created successfully:', responseData);
      
      // Refresh equipment data
      await fetchEquipmentData();
      
      // Reset form and close dialog
      setNewGenerator({
        branch: '',
        company: '',
        cost_code: '',
        ip_address: '',
        notes: '',
        is_active: true,
      });
      setAddDialogOpen(false);
      
      toast({
        title: "Generator Added",
        description: "New generator has been added successfully",
      });
    } catch (error) {
      console.error('Error adding generator:', error);
      toast({
        title: "Error Adding Generator",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cost center click (same as dashboard)
  const handleCostCenterClick = async (costCenter: HierarchicalCostCenter) => {
    console.log('🎯 Cost center clicked:', costCenter);
    console.log('🎯 Cost center costCode:', costCenter.costCode);
    
    // Set selected route
    setSelectedRoute({
      id: costCenter.id,
      route: costCenter.name || 'Unknown',
      locationCode: costCenter.costCode || 'N/A',
      costCode: costCenter.costCode || undefined
    });
    
    // Fetch real-time data for this cost center
    await fetchRealtimeData(costCenter);
    
    // Equipment data is loaded once globally; do not filter per cost center
    
    // Show vehicles view
    setShowVehicles(true);
    
    // Update URL parameters
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', 'vehicles');
    params.set('route', costCenter.id);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Handle back to table (same as dashboard)
  const handleBackToTable = () => {
    // No-op in simplified view
    return;
  };

  // Initialize data (same as dashboard)
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        await fetchRealtimeData();
        await fetchEquipmentData();
      } catch (error) {
        console.error('Error initializing data:', error);
        setError('Failed to initialize data');
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [selectedRoute]);
  
  // Get unique cost codes from equipment data for the dropdown
  const getUniqueCostCodes = () => {
    const costCodes = new Set<string>();
    
    equipmentData.forEach(equipment => {
      if (equipment.cost_code) {
        costCodes.add(equipment.cost_code);
      }
    });
    
    return Array.from(costCodes).sort();
  };
  
  const uniqueCostCodes = getUniqueCostCodes();

  // Handle URL parameters (same as dashboard)
  useEffect(() => {
    const view = searchParams.get('view');
    const route = searchParams.get('route');
    
    if (view === 'vehicles' && route) {
      const foundCostCenter = costCenters.find(cc => cc.id === route);
      if (foundCostCenter) {
        setSelectedRoute({
          id: foundCostCenter.id,
          route: foundCostCenter.name || 'Unknown',
          locationCode: foundCostCenter.costCode || 'N/A',
          costCode: foundCostCenter.costCode || undefined
        });
        setShowVehicles(true);
        fetchRealtimeData(foundCostCenter);
      }
    }
  }, [searchParams, costCenters]);

  // Show vehicles view when a cost center is selected
  if (showVehicles) {
    return (
      <div className="flex flex-col h-full">
        <TopNavigation />
        
        <div className="flex-1 space-y-6 p-6">
          {/* Equipment Details Section */}

          {/* Equipment Details */}
          <Card className="shadow-sm border border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="font-semibold text-gray-900 text-lg">
                  Equipment Details
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="default" 
                    size="sm"
                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700"
                    onClick={() => setAddDialogOpen(true)}
                  >
                    <PlusCircle className="w-4 h-4" /> Add Generator
                  </Button>
                  <Badge variant="outline" className="text-gray-600">
                    All Generators
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {equipmentLoading ? (
                <div className="py-12 text-gray-500 text-center">
                  <RefreshCw className="mx-auto mb-4 w-8 h-8 text-gray-400 animate-spin" />
                  <p className="font-medium text-lg">Loading Equipment...</p>
                  <p className="text-sm">Fetching vehicles for {selectedRoute?.name}</p>
                </div>
              ) : equipmentData.length === 0 ? (
                <div className="py-12 text-gray-500 text-center">
                  <Building2 className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                  <p className="font-medium text-lg">No Data Available</p>
                  <p className="text-sm">No equipment data found for {selectedRoute?.name}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="gap-4 grid grid-cols-1 md:grid-cols-4 mb-6">

                    

                  </div>

                  {/* Equipment Table */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">BRANCH</th>
                            <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">COMPANY</th>
                            <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">COST CODE</th>
                            <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">IP ADDRESS</th>
                            <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">TANK VOLUME</th>
                            <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">NOTES</th>
                            <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {equipmentData.map((equipment) => (
                            <tr key={equipment.id} className={`hover:bg-gray-50 ${editingRowId === equipment.id ? 'bg-blue-50' : ''}`}>
                              <td className="px-4 py-4 text-gray-900 text-sm whitespace-nowrap">
                                {editingRowId === equipment.id ? (
                                  <Input 
                                    className="h-8 w-full py-1 px-2"
                                    value={editedEquipment?.branch || ''}
                                    onChange={(e) => handleInputChange(e, 'branch')}
                                  />
                                ) : (
                                  equipment.branch
                                )}
                              </td>
                              <td className="px-4 py-4 text-gray-900 text-sm whitespace-nowrap">
                                {editingRowId === equipment.id ? (
                                  <Input 
                                    className="h-8 w-full py-1 px-2"
                                    value={editedEquipment?.company || ''}
                                    onChange={(e) => handleInputChange(e, 'company')}
                                  />
                                ) : (
                                  equipment.company
                                )}
                              </td>
                              <td className="px-4 py-4 text-gray-900 text-sm whitespace-nowrap">
                                {editingRowId === equipment.id ? (
                                  <Input 
                                    className="h-8 w-full py-1 px-2"
                                    value={editedEquipment?.cost_code || ''}
                                    onChange={(e) => handleInputChange(e, 'cost_code')}
                                  />
                                ) : (
                                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                                    {equipment.cost_code}
                                  </code>
                                )}
                              </td>
                              <td className="px-4 py-4 text-gray-900 text-sm whitespace-nowrap">
                                {editingRowId === equipment.id ? (
                                  <Input 
                                    className="h-8 w-full py-1 px-2"
                                    value={editedEquipment?.ip_address || ''}
                                    onChange={(e) => handleInputChange(e, 'ip_address')}
                                  />
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <Wifi className="w-4 h-4 text-gray-400" />
                                    {equipment.ip_address}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-4 text-gray-900 text-sm whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Fuel className="w-4 h-4 text-blue-500" />
                                  {equipment.volume ? `${parseFloat(equipment.volume).toFixed(1)}L` : 'N/A'}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-gray-900 text-sm">
                                {editingRowId === equipment.id ? (
                                  <Textarea 
                                    className="min-h-[60px] w-full py-1 px-2 text-xs"
                                    value={editedEquipment?.notes || ''}
                                    onChange={(e) => handleInputChange(e, 'notes')}
                                    placeholder="Add notes..."
                                  />
                                ) : (
                                  <div className="max-w-xs">
                                    {equipment.notes ? (
                                      <div className="text-xs text-gray-600 truncate" title={equipment.notes}>
                                        {equipment.notes}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 text-xs">No notes</span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-4 text-gray-900 text-sm whitespace-nowrap">
                                {editingRowId === equipment.id ? (
                                  <div className="flex items-center gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="flex items-center gap-1 text-green-600 hover:text-green-800 hover:bg-green-50 border-green-200"
                                      onClick={() => handleSaveEquipment(equipment)}
                                      disabled={isSaving}
                                    >
                                      {isSaving ? (
                                        <>
                                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                          Saving...
                                        </>
                                      ) : (
                                        <>
                                          <Save className="h-4 w-4" />
                                          Save
                                        </>
                                      )}
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="flex items-center gap-1 text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                                      onClick={handleCancelEdit}
                                      disabled={isSaving}
                                    >
                                      <X className="h-4 w-4" />
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex space-x-2">
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                      onClick={() => handleEditEquipment(equipment)}
                                    >
                                      <PenSquare className="h-4 w-4" />
                                      Edit
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="flex items-center gap-1 text-red-600 hover:text-red-800 hover:bg-red-50"
                                      onClick={() => handleDeleteEquipment(equipment)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Delete
                                    </Button>
                                  </div>
                                )}
                              </td>
                              {/* <td className="px-4 py-4 text-gray-900 text-sm whitespace-nowrap">
                                <div className="text-xs text-gray-600">
                                  {new Date(equipment.last_message_date).toLocaleString()}
                                </div>
                              </td> */}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Add Generator Dialog */}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogContent className="sm:max-w-lg bg-white border border-gray-200">
              <DialogHeader className="pb-2 border-b border-gray-100">
                <DialogTitle className="text-xl font-semibold text-blue-800">Add New Generator</DialogTitle>
                <DialogDescription className="text-gray-600 text-sm">
                  Enter the details for the new generator. All fields are required.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-3 py-3">
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="branch" className="text-right font-medium text-gray-700 col-span-1">Branch*</Label>
                  <Input
                    id="branch"
                    className="col-span-3 h-9 border-gray-200 focus:border-blue-300 focus:ring-blue-300"
                    placeholder="Enter branch name (required)"
                    value={newGenerator.branch || ''}
                    onChange={(e) => handleNewGeneratorChange('branch', e.target.value)}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="company" className="text-right font-medium text-gray-700 col-span-1">Company</Label>
                  <Input
                    id="company"
                    className="col-span-3 h-9 border-gray-200 focus:border-blue-300 focus:ring-blue-300"
                    placeholder="Enter company name"
                    value={newGenerator.company || ''}
                    onChange={(e) => handleNewGeneratorChange('company', e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="cost_code" className="text-right font-medium text-gray-700 col-span-1">Cost Code</Label>
                  <div className="col-span-3">
                    {uniqueCostCodes.length > 0 ? (
                      <Select
                        value={newGenerator.cost_code || ''}
                        onValueChange={(value) => handleNewGeneratorChange('cost_code', value)}
                      >
                        <SelectTrigger className="h-9 border-gray-200 focus:border-blue-300 focus:ring-blue-300">
                          <SelectValue placeholder="Select a cost code" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-200 max-h-60">
                          {uniqueCostCodes.map((code) => {
                            // Find equipment with this cost code to get branch info
                            const relatedEquipment = equipmentData.find(eq => eq.cost_code === code);
                            const branchInfo = relatedEquipment ? ` (${relatedEquipment.branch})` : '';
                            
                            return (
                              <SelectItem key={code} value={code} className="py-1.5">
                                <div className="flex items-center text-sm">
                                  <span className="font-mono bg-blue-50 px-1.5 py-0.5 rounded mr-1.5 text-blue-800">{code}</span>
                                  {branchInfo && <span className="text-gray-600 text-xs">{branchInfo}</span>}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="cost_code"
                        className="w-full h-9 border-gray-200 focus:border-blue-300 focus:ring-blue-300"
                        placeholder="Enter cost code"
                        value={newGenerator.cost_code || ''}
                        onChange={(e) => handleNewGeneratorChange('cost_code', e.target.value)}
                      />
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="ip_address" className="text-right font-medium text-gray-700 col-span-1">IP Address</Label>
                  <Input
                    id="ip_address"
                    className="col-span-3 h-9 border-gray-200 focus:border-blue-300 focus:ring-blue-300"
                    placeholder="Enter IP address"
                    value={newGenerator.ip_address || ''}
                    onChange={(e) => handleNewGeneratorChange('ip_address', e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-4 items-start gap-2">
                  <Label htmlFor="notes" className="text-right font-medium text-gray-700 col-span-1 pt-2">Notes</Label>
                  <Textarea
                    id="notes"
                    className="col-span-3 min-h-[80px]"
                    placeholder="Enter notes about this generator"
                    value={newGenerator.notes || ''}
                    onChange={(e) => handleNewGeneratorChange('notes', e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="is_active" className="text-right font-medium text-gray-700 col-span-1">Status</Label>
                  <div className="flex items-center gap-2 col-span-3">
                    <Switch
                      id="is_active"
                      checked={newGenerator.is_active !== false}
                      onCheckedChange={(checked) => handleNewGeneratorChange('is_active', checked)}
                    />
                    <Label htmlFor="is_active" className="text-sm text-gray-600">
                      {newGenerator.is_active !== false ? "Active" : "Inactive"}
                    </Label>
                  </div>
                </div>
              </div>
              
              <DialogFooter className="pt-2 border-t border-gray-100">
                <Button 
                  variant="outline" 
                  onClick={() => setAddDialogOpen(false)}
                  className="mr-2 h-9 px-4 text-sm border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddGenerator}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 h-9 px-5 text-sm font-medium"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : "Add Generator"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  // Main Equipment view (same structure as dashboard)
  return (
    <div className="flex flex-col h-full">
      <TopNavigation />
      
      <div className="flex-1 space-y-6 p-6">
        {/* Removed Dashboard Statistics */}

        {/* Main Hierarchical Table */}
        <HierarchicalTable
          data={costCenters}
          onRowClick={handleCostCenterClick}
          title="Equipment"
          subtitle="Vehicle and equipment management by cost center"
          showSearch={true}
          showFilters={true}
        />
        
        {/* Add Generator Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="sm:max-w-lg bg-white border border-gray-200">
            <DialogHeader className="pb-2 border-b border-gray-100">
              <DialogTitle className="text-xl font-semibold text-blue-800">Add New Generator</DialogTitle>
              <DialogDescription className="text-gray-600 text-sm">
                Enter the details for the new generator. All fields are required.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-3 py-3">
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="branch" className="text-right font-medium text-gray-700 col-span-1">Branch*</Label>
                <Input
                  id="branch"
                  className="col-span-3 h-9 border-gray-200 focus:border-blue-300 focus:ring-blue-300"
                  placeholder="Enter branch name (required)"
                  value={newGenerator.branch || ''}
                  onChange={(e) => handleNewGeneratorChange('branch', e.target.value)}
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="company" className="text-right font-medium text-gray-700 col-span-1">Company</Label>
                <Input
                  id="company"
                  className="col-span-3 h-9 border-gray-200 focus:border-blue-300 focus:ring-blue-300"
                  placeholder="Enter company name"
                  value={newGenerator.company || ''}
                  onChange={(e) => handleNewGeneratorChange('company', e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="cost_code" className="text-right font-medium text-gray-700 col-span-1">Cost Code</Label>
                <div className="col-span-3">
                  {uniqueCostCodes.length > 0 ? (
                    <Select
                      value={newGenerator.cost_code || ''}
                      onValueChange={(value) => handleNewGeneratorChange('cost_code', value)}
                    >
                      <SelectTrigger className="h-9 border-gray-200 focus:border-blue-300 focus:ring-blue-300">
                        <SelectValue placeholder="Select a cost code" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-200 max-h-60">
                        {uniqueCostCodes.map((code) => {
                          // Find equipment with this cost code to get branch info
                          const relatedEquipment = equipmentData.find(eq => eq.cost_code === code);
                          const branchInfo = relatedEquipment ? ` (${relatedEquipment.branch})` : '';
                          
                          return (
                            <SelectItem key={code} value={code} className="py-1.5">
                              <div className="flex items-center text-sm">
                                <span className="font-mono bg-blue-50 px-1.5 py-0.5 rounded mr-1.5 text-blue-800">{code}</span>
                                {branchInfo && <span className="text-gray-600 text-xs">{branchInfo}</span>}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="cost_code"
                      className="w-full h-9 border-gray-200 focus:border-blue-300 focus:ring-blue-300"
                      placeholder="Enter cost code"
                      value={newGenerator.cost_code || ''}
                      onChange={(e) => handleNewGeneratorChange('cost_code', e.target.value)}
                    />
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="ip_address" className="text-right font-medium text-gray-700 col-span-1">IP Address</Label>
                <Input
                  id="ip_address"
                  className="col-span-3 h-9 border-gray-200 focus:border-blue-300 focus:ring-blue-300"
                  placeholder="Enter IP address"
                  value={newGenerator.ip_address || ''}
                  onChange={(e) => handleNewGeneratorChange('ip_address', e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-4 items-start gap-2">
                <Label htmlFor="notes" className="text-right font-medium text-gray-700 col-span-1 pt-2">Notes</Label>
                <Textarea
                  id="notes"
                  className="col-span-3 min-h-[80px]"
                  placeholder="Enter notes about this generator"
                  value={newGenerator.notes || ''}
                  onChange={(e) => handleNewGeneratorChange('notes', e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="is_active" className="text-right font-medium text-gray-700 col-span-1">Status</Label>
                <div className="flex items-center gap-2 col-span-3">
                  <Switch
                    id="is_active"
                    checked={newGenerator.is_active !== false}
                    onCheckedChange={(checked) => handleNewGeneratorChange('is_active', checked)}
                  />
                  <Label htmlFor="is_active" className="text-sm text-gray-600">
                    {newGenerator.is_active !== false ? "Active" : "Inactive"}
                  </Label>
                </div>
              </div>
            </div>
            
            <DialogFooter className="pt-2 border-t border-gray-100">
              <Button 
                variant="outline" 
                onClick={() => setAddDialogOpen(false)}
                className="mr-2 h-9 px-4 text-sm border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddGenerator}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 h-9 px-5 text-sm font-medium"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : "Add Generator"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
