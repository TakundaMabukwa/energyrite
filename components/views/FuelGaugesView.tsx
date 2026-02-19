'use client';

import React, { useState, useEffect } from 'react';
import { FuelGauge } from '@/components/ui/fuel-gauge';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';


import { RefreshCw, Fuel } from 'lucide-react';
import { ColorPicker } from '@/components/ui/color-picker';
import { getLastFuelFill, FuelFill } from '@/lib/fuel-fill-detector';
import { formatForDisplay } from '@/lib/utils/date-formatter';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import { getApiUrl } from '@/lib/utils/api-url';

interface FuelGaugesViewProps {
  onBack: () => void;
}

interface FuelConsumptionData {
  id?: string | number;
  plate: string;
  branch: string;
  company: string;
  fuel_probe_1_level_percentage: number;
  fuel_probe_1_volume_in_tank: number;
  fuel_probe_2_level_percentage: number;
  fuel_probe_2_volume_in_tank: number;
  current_status: string;
  last_message_date: string;
  updated_at?: string;
  fuel_anomaly?: string;
  fuel_anomaly_note?: string;
  notes?: string | null;
  client_notes?: string | null;
  volume?: number;
  fuel_probe_1_temperature?: number;
  lastFuelFill?: FuelFill;
}



export function FuelGaugesView({ onBack }: FuelGaugesViewProps) {
  const { fuelData, selectedRoute, vehicles, loading: contextLoading } = useApp();
  const { userSiteId, isAdmin } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fuelConsumptionData, setFuelConsumptionData] = useState<FuelConsumptionData[]>([]);
  

  const [fuelGaugeColors, setFuelGaugeColors] = useState({
    high: '#00FF00', // green
    medium: '#FFFF00', // yellow
    low: '#FF0000', // red
  });

  // Handle note updates
  const handleNoteUpdate = (vehicleId: string | number, note: string) => {
    setFuelConsumptionData(prev => 
      prev.map(vehicle => 
        vehicle.id === vehicleId 
          ? { ...vehicle, client_notes: note }
          : vehicle
      )
    );
  };
  


  // Fetch color codes from Supabase user settings
  const fetchColorCodes = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) return;

      const { data, error } = await supabase
        .from('fuel_gauge_settings')
        .select('color_high, color_medium, color_low')
        .eq('user_id', authUser.id)
        .single();
      
      if (!error && data) {
        setFuelGaugeColors({
          high: data.color_high,
          medium: data.color_medium,
          low: data.color_low,
        });
      }
    } catch (error) {
      console.warn('Could not fetch color codes from Supabase:', error);
    }
  };

  // Build fuel data from global vehicles in context (initial + realtime)
  const fetchFuelData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const costCode = (selectedRoute as any)?.costCode;
      const source = Array.isArray(vehicles) ? vehicles : [];
      
      let filtered = costCode 
        ? source.filter((v: any) => v.cost_code === costCode || v.cost_code?.startsWith(costCode + '-')) 
        : source; // Show ALL vehicles when no cost code selected
      
      // Apply single site filtering if user has site_id and is not admin
      if (userSiteId && !isAdmin) {
        filtered = filtered.filter((v: any) => 
          v.branch === userSiteId
        );
      }


      


      const mapped: FuelConsumptionData[] = filtered.map((vehicle: any, index: number) => {
        return {
          id: vehicle.id,
          plate: vehicle.plate,
          branch: vehicle.branch,
          company: vehicle.company,
          fuel_probe_1_level_percentage: parseFloat(vehicle.fuel_probe_1_level_percentage),
          fuel_probe_1_volume_in_tank: parseFloat(vehicle.fuel_probe_1_volume_in_tank),
          fuel_probe_2_level_percentage: parseFloat(vehicle.fuel_probe_2_level_percentage),
          fuel_probe_2_volume_in_tank: parseFloat(vehicle.fuel_probe_2_volume_in_tank),
          current_status: vehicle.drivername,
          last_message_date: vehicle.last_message_date,
          updated_at: vehicle.updated_at,
          fuel_anomaly: vehicle.fuel_anomaly,
          fuel_anomaly_note: vehicle.fuel_anomaly_note,
          notes: vehicle.notes,
          client_notes: vehicle.client_notes,
          volume: 0,
          fuel_probe_1_temperature: parseFloat(vehicle.fuel_probe_1_temperature),
          lastFuelFill: undefined
        };
      });

      // Fetch tank capacities from Supabase
      if (mapped.length > 0) {
        try {
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          const vehicleIds = mapped.map(v => v.id?.toString()).filter(Boolean);
          
          const { data: tankData, error: tankError } = await supabase
            .from('vehicle_settings')
            .select('vehicle_id, tank_size')
            .in('vehicle_id', vehicleIds);
          
          if (tankData) {
            console.log('Tank data sample:', tankData.slice(0, 3));
            const tankSizes = new Map<string, number>();
            tankData.forEach(tank => {
              const size = parseFloat(tank.tank_size);
              if (!isNaN(size)) {
                tankSizes.set(tank.vehicle_id, size);
              }
            });
            console.log('Tank sizes map size:', tankSizes.size);
            
            mapped.forEach(vehicle => {
              const vid = vehicle.id?.toString();
              if (vid) {
                const tankSize = tankSizes.get(vid);
                if (tankSize !== undefined) {
                  vehicle.volume = tankSize;
                  console.log(`Set tank for ${vid}:`, tankSize);
                }
              }
            });
          }
        } catch (err) {
          console.warn('⚠️ Could not fetch tank sizes from Supabase:', err);
        }
      }

      // Fetch activity report data to detect fuel fills
      if (costCode) {
        try {
          const today = new Date().toISOString().split('T')[0];
          const activityUrl = userSiteId 
            ? `/api/energy-rite/reports/activity?date=${today}&site_id=${userSiteId}`
            : `/api/energy-rite/reports/activity?date=${today}&cost_code=${costCode}`;
          
          const activityResponse = await fetch(activityUrl);
          
          if (activityResponse.ok) {
            const activityData = await activityResponse.json();
            
            if (activityData.success && activityData.data?.sites) {
              // Process each site to detect fuel fills
              const sitesWithFills = activityData.data.sites.map((site: any) => {
                const lastFill = getLastFuelFill(
                  site.snapshots || [], 
                  site.site_id || site.id, 
                  site.branch || site.name
                );
                return { siteId: site.site_id || site.id, lastFill };
              });

              // Update mapped data with fuel fill information
              mapped.forEach(vehicle => {
                const siteData = sitesWithFills.find(s => s.siteId === vehicle.id);
                if (siteData?.lastFill) {
                  vehicle.lastFuelFill = siteData.lastFill;
                }
              });
            }
          }
        } catch (err) {
          console.warn('⚠️ Could not fetch activity report for fuel fills:', err);
        }
      }

      setFuelConsumptionData(mapped);
      
      // Batch fetch all notes from Supabase in one query
      if (mapped.length > 0) {
        try {
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          const vehicleIds = mapped.map(v => v.id?.toString()).filter(Boolean);
          
          const { data: notesData } = await supabase
            .from('note_logs')
            .select('vehicle_id, new_note, note_type')
            .in('vehicle_id', vehicleIds)
            .order('created_at', { ascending: false });
          
          if (notesData) {
            const internalNotes = new Map<string, string | null>();
            const externalNotes = new Map<string, string | null>();
            
            notesData.forEach(note => {
              if (note.note_type === 'internal' && !internalNotes.has(note.vehicle_id)) {
                internalNotes.set(note.vehicle_id, note.new_note);
              } else if (note.note_type === 'external' && !externalNotes.has(note.vehicle_id)) {
                externalNotes.set(note.vehicle_id, note.new_note);
              }
            });
            
            mapped.forEach(vehicle => {
              const vid = vehicle.id?.toString();
              if (vid) {
                vehicle.notes = internalNotes.get(vid) || vehicle.notes;
                vehicle.client_notes = externalNotes.get(vid) || vehicle.client_notes;
              }
            });
          }
        } catch (err) {
          console.warn('⚠️ Could not fetch notes from Supabase:', err);
        }
      }
    } catch (err) {
      console.error('❌ Error fetching vehicle data:', err);
      setError('Failed to load vehicle data. Please try again.');
      
      // Set dummy fuel consumption data when API fails
      const dummyFuelData: FuelConsumptionData[] = [
        {
          plate: 'SPUR THUVL',
          branch: 'Johannesburg',
          company: 'SPUR Corporation',
          fuel_probe_1_level_percentage: 78,
          fuel_probe_1_volume_in_tank: 125.5,
          fuel_probe_2_level_percentage: 76,
          fuel_probe_2_volume_in_tank: 120.2,
          current_status: 'Active',
          last_message_date: new Date().toISOString(),
          fuel_anomaly: false,
          fuel_anomaly_note: '',
          notes: 'Regular maintenance completed last week'
        },
        {
          plate: 'KFC WEST',
          branch: 'Cape Town',
          company: 'YUM Equity',
          fuel_probe_1_level_percentage: 65,
          fuel_probe_1_volume_in_tank: 98.2,
          fuel_probe_2_level_percentage: 63,
          fuel_probe_2_volume_in_tank: 95.1,
          current_status: 'Active',
          last_message_date: new Date().toISOString(),
          fuel_anomaly: false,
          fuel_anomaly_note: '',
          notes: 'Generator scheduled for fuel delivery tomorrow'
        },
        {
          plate: 'MUSHROOM',
          branch: 'Durban',
          company: 'Mushroom Group',
          fuel_probe_1_level_percentage: 82,
          fuel_probe_1_volume_in_tank: 145.8,
          fuel_probe_2_level_percentage: 80,
          fuel_probe_2_volume_in_tank: 142.3,
          current_status: 'Active',
          last_message_date: new Date().toISOString(),
          fuel_anomaly: false,
          fuel_anomaly_note: ''
        },
        {
          plate: 'SPUR CENTRAL',
          branch: 'Pretoria',
          company: 'SPUR Corporation',
          fuel_probe_1_level_percentage: 45,
          fuel_probe_1_volume_in_tank: 67.3,
          fuel_probe_2_level_percentage: 43,
          fuel_probe_2_volume_in_tank: 64.8,
          current_status: 'Low Fuel',
          last_message_date: new Date().toISOString(),
          fuel_anomaly: false,
          fuel_anomaly_note: ''
        },
        {
          plate: 'KFC EAST',
          branch: 'Port Elizabeth',
          company: 'YUM Equity',
          fuel_probe_1_level_percentage: 91,
          fuel_probe_1_volume_in_tank: 156.7,
          fuel_probe_2_level_percentage: 89,
          fuel_probe_2_volume_in_tank: 153.2,
          current_status: 'Active',
          last_message_date: new Date().toISOString(),
          fuel_anomaly: false,
          fuel_anomaly_note: ''
        },
        {
          plate: 'SPUR NORTH',
          branch: 'Bloemfontein',
          company: 'SPUR Corporation',
          fuel_probe_1_level_percentage: 72,
          fuel_probe_1_volume_in_tank: 112.4,
          fuel_probe_2_level_percentage: 70,
          fuel_probe_2_volume_in_tank: 109.8,
          current_status: 'Active',
          last_message_date: new Date().toISOString(),
          fuel_anomaly: true,
          fuel_anomaly_note: 'Possible fuel theft: 15.2L in 12 minutes',
          notes: null
        }
      ];
      
      setFuelConsumptionData(dummyFuelData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wait for AppContext to finish loading vehicles
    if (contextLoading) return;
    
    fetchColorCodes();
    fetchFuelData();
  }, [selectedRoute, vehicles, contextLoading]);

  // Convert fuel consumption data to fuel gauge format
  const getFuelGaugeData = () => {
    return fuelConsumptionData
      .map((vehicle, index) => {
        // Use parseFloat for better string to number conversion
        const percent = parseFloat(vehicle.fuel_probe_1_level_percentage) || 0;
        const capacity = parseFloat(vehicle.fuel_probe_1_volume_in_tank) || 0;
        const remaining = capacity * (percent / 100);

        return ({
        id: vehicle.id,
        location: vehicle.branch,
        fuelLevel: vehicle.fuel_probe_1_level_percentage,
        temperature: vehicle.fuel_probe_1_temperature,
        volume: vehicle.volume,
        currentVolume: vehicle.fuel_probe_1_volume_in_tank,
        remaining: `${vehicle.fuel_probe_1_volume_in_tank}L`,
        status: vehicle.current_status,
        lastUpdated: formatForDisplay(vehicle.last_message_date),
        updated_at: vehicle.updated_at,
        anomaly: vehicle.fuel_anomaly,
        anomalyNote: vehicle.notes,
        clientNote: vehicle.client_notes,
        lastFuelFill: vehicle.lastFuelFill,
        vehicleData: vehicle
      });
    })
    .sort((a, b) => {
      // Sort purely alphabetically by location name
      return a.location.localeCompare(b.location);
    });
  };

  const fuelGaugeData = getFuelGaugeData();
  const activeSitesCount = fuelGaugeData.length;

  if (loading || contextLoading) {
    return (
      <div className="flex justify-center items-center bg-gray-50 h-full">
        <div className="text-center">
          <div className="mx-auto mb-4 border-b-2 border-blue-600 rounded-full w-12 h-12 animate-spin"></div>
          <p className="text-gray-600">Loading fuel data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center bg-gray-50 h-full">
        <div className="text-center">
          <div className="mx-auto mb-4 text-red-500 text-6xl">⚠️</div>
          <p className="mb-4 text-red-600">Error loading fuel data</p>
          <p className="mb-4 text-gray-600">{error}</p>
          <Button onClick={fetchFuelData} variant="outline">
            <RefreshCw className="mr-2 w-4 h-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 h-full">
      
      {/* Gauges Header */}
      <div className="flex justify-between items-center px-4 pt-4 pb-2">
        <h2 className="font-semibold text-gray-900 text-lg">Fuel Gauges</h2>
        <div className="flex items-center gap-3">
          <span className="bg-blue-100 px-3 py-1 rounded-full font-medium text-blue-800 text-sm">
            {activeSitesCount} Active Sites
          </span>
          <ColorPicker onColorChange={setFuelGaugeColors} />
        </div>
      </div>

      {/* Gauges Grid */}
      <div className="p-4">
        {activeSitesCount > 0 ? (
          <div className="gap-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 xl:grid-cols-5">
            {fuelGaugeData.map((data) => (
              <FuelGauge
                key={data.id}
                id={data.id}
                location={data.location}
                fuelLevel={data.fuelLevel}
                temperature={data.temperature}
                volume={data.volume}
                currentVolume={data.currentVolume}
                remaining={data.remaining}
                status={data.status}
                lastUpdated={data.lastUpdated}
                updated_at={data.updated_at}
                anomalyNote={data.anomalyNote}
                clientNote={data.clientNote}
                anomaly={data.anomaly}
                lastFuelFill={data.lastFuelFill}
                vehicleData={data.vehicleData}
                onNoteUpdate={handleNoteUpdate}
                colorCodes={fuelGaugeColors}
                className="hover:scale-105 transition-transform duration-200 transform"
              />
            ))}
          </div>
        ) : (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <Fuel className="mx-auto mb-4 w-16 h-16 text-gray-400" />
              <p className="text-gray-500 text-lg">No fuel data available</p>
              <p className="text-gray-400 text-sm">Check your connection to the Energy Rite server</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
