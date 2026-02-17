'use client';

import React, { useState, useEffect } from 'react';
import { HierarchicalTable } from '@/components/ui/hierarchical-table';
import { TopNavigation } from '@/components/layout/TopNavigation';
import { useApp } from '@/contexts/AppContext';
import { useUser } from '@/contexts/UserContext';
import { Badge } from '@/components/ui/badge';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Activity, Fuel, AlertTriangle, Clock, Wifi, Building2, PenSquare, Save, X, PlusCircle, Trash2, Filter, Search } from 'lucide-react';
import { HierarchicalCostCenter } from '@/lib/supabase/cost-centers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { getApiUrl } from '@/lib/utils/api-url';
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
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Check if user email contains @soltrack.co.za
  const canViewNotes = user?.email?.includes('@soltrack.co.za') || false;
  
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
  const [selectedCostCode, setSelectedCostCode] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const hasInitialized = React.useRef(false);
  
  // Add generator dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [equipmentToDelete, setEquipmentToDelete] = useState<VehicleEquipment | null>(null);
  const [newGenerator, setNewGenerator] = useState<Partial<VehicleEquipment>>({
    branch: '',
    company: '',
    cost_code: '',
    ip_address: '',
    notes: '',
    volume: '',
    plate: '',
    is_active: true,
  });
  const { toast } = useToast();
  
  // Get all cost centers flattened for dropdown
  const getAllCostCenters = () => {
    const allCenters: HierarchicalCostCenter[] = [];
    const flatten = (centers: HierarchicalCostCenter[]) => {
      centers.forEach(center => {
        allCenters.push(center);
        if (center.children && center.children.length > 0) {
          flatten(center.children);
        }
      });
    };
    flatten(costCenters);
    return allCenters;
  };
  
  const allCostCenters = getAllCostCenters();

  // Fetch real-time dashboard data (same as dashboard)
  const fetchRealtimeData = async (costCenter?: HierarchicalCostCenter) => {
    try {
      setLoading(true);
      setError(null);
      
      let url = getApiUrl('/api/energy-rite-reports/realtime-dashboard');
      
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

  // Build equipment data from dashboard API
  const fetchEquipmentData = async () => {
    try {
      setEquipmentLoading(true);
      setError(null);
      
      const response = await fetch(getApiUrl('/api/internal/dashboard-vehicles'));
      
      if (!response.ok) {
        throw new Error(`Failed to fetch vehicles: ${response.status}`);
      }
      
      const json = await response.json();
      const source = json?.success && Array.isArray(json.data) ? json.data : [];
      
      const supabase = createClient();
      const [notesResult, tankResult] = await Promise.all([
        supabase.from('note_logs').select('vehicle_id, new_note').order('created_at', { ascending: false }),
        supabase.from('vehicle_settings').select('vehicle_id, tank_size')
      ]);
      
      const latestNotes = new Map<string, string | null>();
      notesResult.data?.forEach(note => {
        if (!latestNotes.has(note.vehicle_id)) {
          latestNotes.set(note.vehicle_id, note.new_note);
        }
      });
      
      const tankSizes = new Map<string, number>();
      tankResult.data?.forEach(tank => {
        tankSizes.set(tank.vehicle_id, tank.tank_size);
      });
      
      const equipment: VehicleEquipment[] = source.map((vehicle: any) => {
        const vehicleId = vehicle.id.toString();
        const tankSize = tankSizes.get(vehicleId);
        
        return {
          id: vehicle.id,
          branch: vehicle.branch || 'Unknown Branch',
          company: vehicle.company || 'Unknown Company',
          plate: vehicle.plate,
          ip_address: vehicle.quality || vehicle.ip_address || '',
          cost_code: vehicle.cost_code || '',
          speed: vehicle.speed || '0',
          latitude: vehicle.latitude || '0',
          longitude: vehicle.longitude || '0',
          loctime: vehicle.loctime || '',
          quality: vehicle.quality || '',
          mileage: vehicle.mileage || '0',
          pocsagstr: vehicle.pocsagstr,
          head: vehicle.head,
          geozone: vehicle.geozone || '',
          drivername: vehicle.drivername,
          nameevent: vehicle.nameevent,
          temperature: vehicle.temperature || '0',
          address: vehicle.address || '',
          fuel_probe_1_level: vehicle.fuel_probe_1_level || '0',
          fuel_probe_1_volume_in_tank: vehicle.fuel_probe_1_volume_in_tank || '0',
          fuel_probe_1_temperature: vehicle.fuel_probe_1_temperature || '0',
          fuel_probe_1_level_percentage: vehicle.fuel_probe_1_level_percentage || '0',
          fuel_probe_2_level: vehicle.fuel_probe_2_level,
          fuel_probe_2_volume_in_tank: vehicle.fuel_probe_2_volume_in_tank,
          fuel_probe_2_temperature: vehicle.fuel_probe_2_temperature,
          fuel_probe_2_level_percentage: vehicle.fuel_probe_2_level_percentage,
          status: vehicle.status,
          last_message_date: vehicle.last_message_date || new Date().toISOString(),
          updated_at: vehicle.updated_at || new Date().toISOString(),
          volume: tankSize ? tankSize.toString() : '0',
          theft: vehicle.theft || false,
          theft_time: vehicle.theft_time,
          previous_fuel_level: vehicle.previous_fuel_level,
          previous_fuel_time: vehicle.previous_fuel_time,
          activity_start_time: vehicle.activity_start_time,
          activity_duration_hours: vehicle.activity_duration_hours,
          total_usage_hours: vehicle.total_usage_hours || '0',
          daily_usage_hours: vehicle.daily_usage_hours || '0',
          is_active: vehicle.is_active !== false,
          last_activity_time: vehicle.last_activity_time,
          fuel_anomaly: vehicle.fuel_anomaly,
          fuel_anomaly_note: vehicle.fuel_anomaly_note,
          last_anomaly_time: vehicle.last_anomaly_time,
          created_at: vehicle.created_at || new Date().toISOString(),
          notes: latestNotes.get(vehicleId) || null
        };
      });
      
      setEquipmentData(equipment);
    } catch (error) {
      console.error('❌ Error building equipment data:', error);
      setError('Failed to load equipment data');
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
    if (!equipment.plate) {
      toast({
        title: "Error",
        description: "Cannot delete: Missing site name",
        variant: "destructive"
      });
      return;
    }
    
    setEquipmentToDelete(equipment);
    setDeleteDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    if (!equipmentToDelete) return;
    
    // Close dialog and update UI immediately
    setDeleteDialogOpen(false);
    setEquipmentData(prev => prev.filter(eq => eq.plate !== equipmentToDelete.plate));
    
    toast({
      title: "Deleting...",
      description: `Removing ${equipmentToDelete.plate}`,
    });
    
    // Delete in background
    try {
      const response = await fetch(`/api/energyrite-sites?plate=${encodeURIComponent(equipmentToDelete.plate!)}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete: ${response.status}`);
      }
      
      toast({
        title: "Successfully Deleted",
        description: `${equipmentToDelete.plate} has been removed`,
      });
    } catch (error) {
      console.error('Error deleting equipment:', error);
      // Revert UI on error
      setEquipmentData(prev => [...prev, equipmentToDelete]);
      toast({
        title: "Error",
        description: "Failed to delete. Changes reverted.",
        variant: "destructive"
      });
    } finally {
      setEquipmentToDelete(null);
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
      
      const originalEquipment = equipmentData.find(item => item.id === editedEquipment.id);
      
      // Check what changed
      const volumeChanged = editedEquipment.volume !== originalEquipment?.volume;
      const notesChanged = editedEquipment.notes !== originalEquipment?.notes;
      const otherFieldsChanged = 
        editedEquipment.branch !== originalEquipment?.branch ||
        editedEquipment.company !== originalEquipment?.company ||
        editedEquipment.cost_code !== originalEquipment?.cost_code ||
        editedEquipment.ip_address !== originalEquipment?.ip_address;
      
      // Save tank size to Supabase
      if (volumeChanged) {
        const supabase = createClient();
        await supabase
          .from('vehicle_settings')
          .upsert({
            vehicle_id: editedEquipment.id.toString(),
            tank_size: parseFloat(editedEquipment.volume || '0'),
          }, {
            onConflict: 'vehicle_id'
          });
      }
      
      // Save notes to Supabase
      if (notesChanged) {
        await logNoteChange(
          editedEquipment.id.toString(), 
          originalEquipment?.notes || '', 
          editedEquipment.notes || '', 
          'update'
        );
      }
      
      // Save other fields to external API
      if (otherFieldsChanged) {
        const siteName = (editedEquipment.branch || editedEquipment.plate || '').trim();
        const updatePayload: any = {
          plate: siteName,
          reg: siteName,
          ip_address: editedEquipment.ip_address || '',
          cost_code: editedEquipment.cost_code || ''
        };
        
        const response = await fetch(process.env.NEXT_PUBLIC_EQUIPMENT_API_HOST ? `http://${process.env.NEXT_PUBLIC_EQUIPMENT_API_HOST}:${process.env.NEXT_PUBLIC_EQUIPMENT_API_PORT}/api/energy-rite/vehicles/${editedEquipment.id}` : `/api/energy-rite/vehicles/${editedEquipment.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload)
        });
        
        if (!response.ok) {
          throw new Error(`Failed to update equipment: ${response.status}`);
        }
      }
      
      // Update UI
      setEquipmentData(prev => 
        prev.map(item => 
          item.id === editedEquipment.id ? {
            ...item,
            branch: editedEquipment.branch,
            company: editedEquipment.company,
            cost_code: editedEquipment.cost_code,
            ip_address: editedEquipment.ip_address,
            volume: editedEquipment.volume,
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
  
  // Log note changes to Supabase - Equipment tab notes are always internal
  const logNoteChange = async (vehicleId: string, oldNote: string, newNote: string, action: string) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase.from('note_logs').insert({
          vehicle_id: vehicleId,
          user_id: user.id,
          user_email: user.email,
          old_note: oldNote || null,
          new_note: newNote || null,
          action: action,
          note_type: 'internal' // Equipment tab notes are always internal
        });
      }
    } catch (error) {
      console.error('Failed to log note change:', error);
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
      
      // Validate required fields
      if (!newGenerator.cost_code) {
        toast({
          title: "Validation Error",
          description: "Cost centre is required",
          variant: "destructive"
        });
        return;
      }
      
      if (!newGenerator.volume) {
        toast({
          title: "Validation Error",
          description: "Tank capacity/size is required",
          variant: "destructive"
        });
        return;
      }
      
      if (!newGenerator.plate) {
        toast({
          title: "Validation Error",
          description: "Site name is required",
          variant: "destructive"
        });
        return;
      }
      
      // Call API route with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch('/api/energyrite-sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plate: newGenerator.plate,
          ip_address: newGenerator.ip_address || '',
          cost_code: newGenerator.cost_code,
          tank_size: newGenerator.volume
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to add generator: ${response.status}`);
      }
      
      // Refresh equipment data
      await fetchEquipmentData();
      
      // Reset form and close dialog
      setNewGenerator({
        branch: '',
        company: '',
        cost_code: '',
        ip_address: '',
        notes: '',
        volume: '',
        plate: '',
        is_active: true,
      });
      setAddDialogOpen(false);
      
      toast({
        title: "Generator Added",
        description: "New generator has been added successfully",
      });
    } catch (error) {
      console.error('Error adding generator:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        toast({
          title: "Request Timeout",
          description: "The request took too long. Please try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error Adding Generator",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          variant: "destructive"
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cost center click (same as dashboard)
  const handleCostCenterClick = async (costCenter: HierarchicalCostCenter) => {
    // Set selected route
    setSelectedRoute({
      id: costCenter.id,
      route: costCenter.name || 'Unknown',
      locationCode: costCenter.costCode || 'N/A',
      costCode: costCenter.costCode || undefined
    });
    
    // Update the cost code filter to match the selected cost center
    if (costCenter.costCode) {
      setSelectedCostCode(costCenter.costCode);
    }
    
    // Fetch equipment data if not already loaded
    if (equipmentData.length === 0) {
      await fetchEquipmentData();
    }
    
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

  // Initialize data - refetch when tab becomes active
  useEffect(() => {
    const initializeData = async () => {
      if (hasInitialized.current) return;
      hasInitialized.current = true;
      
      try {
        setLoading(true);
        await fetchEquipmentData();
      } catch (error) {
        console.error('Error initializing data:', error);
        setError('Failed to initialize data');
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === 'equipment' || activeTab === 'store-equipment') {
      initializeData();
    }
  }, [activeTab]);
  
  // Get unique cost codes from cost centers for the dropdown
  const getUniqueCostCodes = () => {
    const costCodes = new Set<string>();
    
    // Flatten cost centers to get all cost codes
    const flattenCostCenters = (centers: any[]): void => {
      centers.forEach(center => {
        if (center.costCode) {
          costCodes.add(center.costCode);
        }
        if (center.children && center.children.length > 0) {
          flattenCostCenters(center.children);
        }
      });
    };
    
    flattenCostCenters(costCenters);
    return Array.from(costCodes).sort();
  };
  
  // Get count of equipment for a cost code including descendants
  const getEquipmentCountForCostCode = (costCode: string) => {
    if (costCode === 'all') return equipmentData.length;
    return equipmentData.filter(equipment => 
      equipment.cost_code === costCode || 
      equipment.cost_code?.startsWith(costCode + '-')
    ).length;
  };
  
  const uniqueCostCodes = getUniqueCostCodes();
  
  // Filter equipment data based on selected cost code pattern (includes descendants)
  const getFilteredEquipmentData = () => {
    let filtered = equipmentData;
    
    // First filter by selected route (cost center) if available - include descendants
    if (selectedRoute?.costCode) {
      filtered = filtered.filter(equipment => 
        equipment.cost_code === selectedRoute.costCode || 
        equipment.cost_code?.startsWith(selectedRoute.costCode + '-')
      );
    }
    
    // Then filter by dropdown selection if not 'all' - include descendants
    if (selectedCostCode !== 'all') {
      filtered = filtered.filter(equipment => 
        equipment.cost_code === selectedCostCode || 
        equipment.cost_code?.startsWith(selectedCostCode + '-')
      );
    }
    
    // Finally, filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(equipment =>
        (equipment.plate?.toLowerCase().includes(query)) ||
        (equipment.branch?.toLowerCase().includes(query)) ||
        (equipment.ip_address?.toLowerCase().includes(query)) ||
        (equipment.cost_code?.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  };
  
  const filteredEquipmentData = getFilteredEquipmentData();

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
        <div className="sticky top-0 z-10 bg-white">
          <TopNavigation />
        </div>
        
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
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search sites..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-64 h-9"
                    />
                  </div>
                  <Button 
                    variant="default" 
                    size="sm"
                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700"
                    onClick={() => setAddDialogOpen(true)}
                  >
                    <PlusCircle className="w-4 h-4" /> Add Generator
                  </Button>
                  <Badge variant="outline" className="text-gray-600">
                    {filteredEquipmentData.length} Generators
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
              ) : filteredEquipmentData.length === 0 ? (
                <div className="py-12 text-gray-500 text-center">
                  <Building2 className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                  <p className="font-medium text-lg">No Data Available</p>
                  <p className="text-sm">No equipment data found</p>
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
                            <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">IP ADDRESS</th>
                            <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">TANK VOLUME</th>
                            {canViewNotes && (
                              <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">NOTES</th>
                            )}
                            <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredEquipmentData.sort((a, b) => a.branch.localeCompare(b.branch)).map((equipment) => (
                            <tr key={equipment.id} className={`hover:bg-gray-50 ${editingRowId === equipment.id ? 'bg-blue-50' : ''}`}>
                              <td className="px-4 py-4 text-gray-900 text-sm whitespace-nowrap">
                                {editingRowId === equipment.id ? (
                                  <Input 
                                    className="h-8 w-full py-1 px-2"
                                    value={editedEquipment?.branch || ''}
                                    onChange={(e) => handleInputChange(e, 'branch')}
                                  />
                                ) : (
                                  <div>
                                    {equipment.branch}
                                    {equipment.plate && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        Site: {equipment.plate}
                                      </div>
                                    )}
                                  </div>
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
                                {editingRowId === equipment.id ? (
                                  <div className="flex items-center gap-2">
                                    <Fuel className="w-4 h-4 text-blue-500" />
                                    <Input 
                                      className="h-8 w-20 py-1 px-2"
                                      type="number"
                                      step="0.1"
                                      value={editedEquipment?.volume || ''}
                                      onChange={(e) => handleInputChange(e, 'volume')}
                                      placeholder="0.0"
                                    />
                                    <span className="text-xs text-gray-500">L</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <Fuel className="w-4 h-4 text-blue-500" />
                                    {equipment.volume ? `${parseFloat(equipment.volume).toFixed(1)}L` : 'N/A'}
                                  </div>
                                )}
                              </td>
                              {canViewNotes && (
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
                                      {canViewNotes && equipment.notes ? (
                                        <div className="text-xs text-gray-600 truncate" title={equipment.notes}>
                                          {equipment.notes}
                                        </div>
                                      ) : (
                                        <span className="text-gray-400 text-xs">No notes</span>
                                      )}
                                    </div>
                                  )}
                                </td>
                              )}
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
                  <Label htmlFor="cost_code_v" className="text-right font-medium text-gray-700 col-span-1">Cost Centre*</Label>
                  <Select value={newGenerator.cost_code || ''} onValueChange={(value) => handleNewGeneratorChange('cost_code', value)}>
                    <SelectTrigger className="col-span-3 h-9">
                      <SelectValue placeholder="Select cost centre (required)" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCostCenters.filter(cc => cc.costCode !== 'ENERGYRITE').map((cc) => (
                        <SelectItem key={cc.id} value={cc.costCode}>
                          {cc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="site_name_v" className="text-right font-medium text-gray-700 col-span-1">Site Name*</Label>
                  <Input
                    id="site_name_v"
                    className="col-span-3 h-9 border-gray-200 focus:border-blue-300 focus:ring-blue-300"
                    placeholder="Enter site name (required)"
                    value={newGenerator.plate || ''}
                    onChange={(e) => handleNewGeneratorChange('plate', e.target.value)}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="tank_size_v" className="text-right font-medium text-gray-700 col-span-1">Tank Capacity*</Label>
                  <div className="col-span-3 flex items-center gap-2">
                    <Input
                      id="tank_size_v"
                      type="number"
                      step="0.1"
                      className="h-9 border-gray-200 focus:border-blue-300 focus:ring-blue-300"
                      placeholder="Enter tank capacity (required)"
                      value={newGenerator.volume || ''}
                      onChange={(e) => handleNewGeneratorChange('volume', e.target.value)}
                      required
                    />
                    <span className="text-sm text-gray-500">Litres</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="ip_address_v" className="text-right font-medium text-gray-700 col-span-1">IP Address</Label>
                  <Input
                    id="ip_address_v"
                    className="col-span-3 h-9 border-gray-200 focus:border-blue-300 focus:ring-blue-300"
                    placeholder="Enter IP address"
                    value={newGenerator.ip_address || ''}
                    onChange={(e) => handleNewGeneratorChange('ip_address', e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-4 items-start gap-2">
                  <Label htmlFor="notes_v" className="text-right font-medium text-gray-700 col-span-1 pt-2">Notes</Label>
                  <Textarea
                    id="notes_v"
                    className="col-span-3 min-h-[80px]"
                    placeholder="Enter notes about this generator"
                    value={newGenerator.notes || ''}
                    onChange={(e) => handleNewGeneratorChange('notes', e.target.value)}
                  />
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
          
          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold">Delete Equipment</DialogTitle>
                <DialogDescription>
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-6">
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete <span className="font-semibold text-gray-900">{equipmentToDelete?.plate}</span>?
                </p>
              </div>
              
              <DialogFooter className="gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setDeleteDialogOpen(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={confirmDelete}
                  variant="destructive"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : "Delete"}
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

        {/* Cost Code Filter for Main View */}
        <Card className="shadow-sm border border-gray-200">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="font-semibold text-gray-900 text-lg">Equipment</CardTitle>
                <p className="mt-1 text-gray-600 text-sm">Vehicle and equipment management by cost center</p>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <Select value={selectedCostCode} onValueChange={setSelectedCostCode}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by Cost Code" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cost Codes</SelectItem>
                    {uniqueCostCodes.map((code) => {
                      const relatedEquipment = equipmentData.find(eq => eq.cost_code === code);
                      const branchInfo = relatedEquipment ? ` (${relatedEquipment.branch})` : '';
                      return (
                        <SelectItem key={code} value={code}>
                          <div className="flex items-center">
                            <span className="font-mono bg-blue-50 px-1.5 py-0.5 rounded mr-1.5 text-blue-800 text-xs">{code}</span>
                            {branchInfo && <span className="text-gray-600 text-xs">{branchInfo}</span>}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Badge variant="outline" className="text-gray-600">
                  {selectedCostCode === 'all' ? 'All Cost Centers' : `Filtered by: ${selectedCostCode}`}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Main Hierarchical Table */}
        <HierarchicalTable
          data={costCenters}
          onRowClick={handleCostCenterClick}
          title="Cost Centers"
          subtitle="Click on a cost center to view equipment details"
          showSearch={true}
          showFilters={true}
          costCodeFilter={selectedCostCode}
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
                <Label htmlFor="cost_code" className="text-right font-medium text-gray-700 col-span-1">Cost Centre*</Label>
                <Select value={newGenerator.cost_code || ''} onValueChange={(value) => handleNewGeneratorChange('cost_code', value)}>
                  <SelectTrigger className="col-span-3 h-9">
                    <SelectValue placeholder="Select cost centre (required)" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCostCenters.filter(cc => cc.costCode !== 'ENERGYRITE').map((cc) => (
                      <SelectItem key={cc.id} value={cc.costCode}>
                        {cc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="site_name" className="text-right font-medium text-gray-700 col-span-1">Site Name*</Label>
                <Input
                  id="site_name"
                  className="col-span-3 h-9 border-gray-200 focus:border-blue-300 focus:ring-blue-300"
                  placeholder="Enter site name (required)"
                  value={newGenerator.plate || ''}
                  onChange={(e) => handleNewGeneratorChange('plate', e.target.value)}
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="tank_size" className="text-right font-medium text-gray-700 col-span-1">Tank Capacity*</Label>
                <div className="col-span-3 flex items-center gap-2">
                  <Input
                    id="tank_size"
                    type="number"
                    step="0.1"
                    className="h-9 border-gray-200 focus:border-blue-300 focus:ring-blue-300"
                    placeholder="Enter tank capacity (required)"
                    value={newGenerator.volume || ''}
                    onChange={(e) => handleNewGeneratorChange('volume', e.target.value)}
                    required
                  />
                  <span className="text-sm text-gray-500">Litres</span>
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
        
        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">Delete Equipment</DialogTitle>
              <DialogDescription>
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-6">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete <span className="font-semibold text-gray-900">{equipmentToDelete?.plate}</span>?
              </p>
            </div>
            
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmDelete}
                variant="destructive"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
