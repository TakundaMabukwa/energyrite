'use client';

import React, { useState, useEffect } from 'react';
import { FuelGauge } from '@/components/ui/fuel-gauge';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { TopNavigation } from '@/components/layout/TopNavigation';
import { RefreshCw, Fuel } from 'lucide-react';
import { getLastFuelFill, FuelFill } from '@/lib/fuel-fill-detector';
import { formatForDisplay } from '@/lib/utils/date-formatter';

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
  fuel_anomaly?: string;
  fuel_anomaly_note?: string;
  lastFuelFill?: FuelFill;
}

export function FuelGaugesView({ onBack }: FuelGaugesViewProps) {
  const { fuelData, selectedRoute, vehicles } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fuelConsumptionData, setFuelConsumptionData] = useState<FuelConsumptionData[]>([]);

  // Build fuel data from global vehicles in context (initial + realtime)
  const fetchFuelData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const costCode = (selectedRoute as any)?.costCode;
      const source = Array.isArray(vehicles) ? vehicles : [];
      const filtered = costCode ? source.filter((v: any) => v.cost_code === costCode) : source;

      if (!filtered.length) {
        console.log('⚠️ No vehicles available from SSE/context; using dummy data');
      }

      const mapped: FuelConsumptionData[] = filtered.map((vehicle: any, index: number) => {
        // Better string to number conversion with proper parsing
        const percentage = parseFloat(vehicle.fuel_probe_1_level_percentage) || 0;
        const capacity = parseFloat(vehicle.fuel_probe_1_volume_in_tank) || 0;
        const remainingLiters = (Number.isFinite(capacity) && Number.isFinite(percentage))
          ? (capacity * (percentage / 100))
          : 0;

        // Determine engine status based on status and fuel data availability
        let engineStatus;
        if (vehicle.status && vehicle.status !== 'Unknown') {
          engineStatus = vehicle.status;
        } else {
          // If status is null/unknown, check if fuel data is available
          const hasFuelData = vehicle.fuel_probe_1_level_percentage !== null && 
                             vehicle.fuel_probe_1_level_percentage !== undefined &&
                             vehicle.fuel_probe_1_volume_in_tank !== null && 
                             vehicle.fuel_probe_1_volume_in_tank !== undefined;
          
          engineStatus = hasFuelData ? 'OFF' : 'No Signal';
        }

        // Use original time without shift
        const lastMessageDate = vehicle.last_message_date || vehicle.updated_at || new Date().toISOString();

        // Debug logging to help identify conversion issues
        if (percentage === 0 || capacity === 0) {
          console.log('Fuel data conversion debug:', {
            id: vehicle.id,
            branch: vehicle.branch,
            raw_level_percentage: vehicle.fuel_probe_1_level_percentage,
            raw_volume_in_tank: vehicle.fuel_probe_1_volume_in_tank,
            parsed_percentage: percentage,
            parsed_capacity: capacity,
            calculated_remaining: remainingLiters
          });
        }

        return {
          id: vehicle.id || `vehicle-${index + 1}`,
          plate: vehicle.plate || 'Unknown Plate',
          branch: vehicle.branch || 'Unknown Branch',
          company: vehicle.company || 'Unknown Company',
          fuel_probe_1_level_percentage: Math.max(0, Math.min(100, percentage || 0)),
          fuel_probe_1_volume_in_tank: Math.max(0, Number(capacity || 0)),
          fuel_probe_2_level_percentage: parseFloat(vehicle.fuel_probe_2_level_percentage) || 0,
          fuel_probe_2_volume_in_tank: parseFloat(vehicle.fuel_probe_2_volume_in_tank) || 0,
          current_status: engineStatus,
          last_message_date: lastMessageDate,
          fuel_anomaly: vehicle.fuel_anomaly || vehicle.theft || false,
          fuel_anomaly_note: vehicle.fuel_anomaly_note || (vehicle.theft_time ? `Theft detected at ${vehicle.theft_time}` : ''),
          lastFuelFill: undefined // Will be populated below
        };
      });

      // Fetch activity report data to detect fuel fills
      if (costCode) {
        try {
          const today = new Date().toISOString().split('T')[0];
          const activityUrl = `http://${process.env.NEXT_PUBLIC_SERVER_URL}/api/energy-rite/reports/activity-report?date=${today}&cost_code=${costCode}`;
          
          console.log('🔍 Fetching activity report for fuel fill detection:', activityUrl);
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

              console.log('✅ Fuel fills detected:', sitesWithFills.filter(s => s.lastFill).length);
            }
          }
        } catch (err) {
          console.warn('⚠️ Could not fetch activity report for fuel fills:', err);
        }
      }

      setFuelConsumptionData(mapped);
      console.log('✅ Fuel data built from context vehicles:', mapped.length);
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
          fuel_anomaly_note: ''
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
          fuel_anomaly_note: ''
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
          fuel_anomaly_note: 'Possible fuel theft: 15.2L in 12 minutes'
        }
      ];
      
      setFuelConsumptionData(dummyFuelData);
      console.log('🔄 Using dummy fuel consumption data due to API error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFuelData();
  }, [selectedRoute, vehicles]);

  // Convert fuel consumption data to fuel gauge format
  const getFuelGaugeData = () => {
    return fuelConsumptionData
      .map((vehicle, index) => {
        // Use parseFloat for better string to number conversion
        const percent = parseFloat(vehicle.fuel_probe_1_level_percentage) || 0;
        const capacity = parseFloat(vehicle.fuel_probe_1_volume_in_tank) || 0;
        const remaining = capacity * (percent / 100);

        return ({
        id: vehicle.id || index + 1,
        location: vehicle.branch || vehicle.plate || 'Unknown Location',
        fuelLevel: percent || 0,
        temperature: parseFloat(vehicle.fuel_probe_1_temperature) || 25,
        volume: capacity,
        remaining: `${capacity.toFixed(1)}L / ${remaining.toFixed(1)}L`,
        status: vehicle.current_status || 'active',
        lastUpdated: formatForDisplay(vehicle.last_message_date || new Date().toISOString()),
        anomaly: !!vehicle.fuel_anomaly,
        anomalyNote: vehicle.fuel_anomaly_note || '',
        lastFuelFill: vehicle.lastFuelFill
      });
    })
    .sort((a, b) => {
      // Sort in order: ON, OFF, No Signal
      const aIsOn = a.status.includes('ON') || a.status.includes('on');
      const bIsOn = b.status.includes('ON') || b.status.includes('on');
      const aIsOff = a.status.includes('OFF') || a.status.includes('off');
      const bIsOff = b.status.includes('OFF') || b.status.includes('off');
      const aIsNoSignal = a.status.includes('No Signal');
      const bIsNoSignal = b.status.includes('No Signal');
      
      // ON comes first
      if (aIsOn && !bIsOn) return -1;
      if (!aIsOn && bIsOn) return 1;
      
      // If both are ON or both are not ON, check OFF status
      if (aIsOn === bIsOn) {
        if (aIsOff && !bIsOff) return -1; // a is OFF, b is not OFF
        if (!aIsOff && bIsOff) return 1;  // b is OFF, a is not OFF
        
        // If both are OFF or both are not OFF, check No Signal status
        if (aIsOff === bIsOff) {
          if (aIsNoSignal && !bIsNoSignal) return -1; // a is No Signal, b is not
          if (!aIsNoSignal && bIsNoSignal) return 1;  // b is No Signal, a is not
        }
      }
      
      return 0; // maintain original order for same status
    });
  };

  if (loading) {
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
      <TopNavigation />

      {/* Gauges Grid */}
      <div className="p-4">
        {fuelConsumptionData.length > 0 ? (
          <div className="gap-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 xl:grid-cols-5">
            {getFuelGaugeData().map((data) => (
              <FuelGauge
                key={data.id}
                location={data.location}
                fuelLevel={data.fuelLevel}
                temperature={data.temperature}
                volume={data.volume}
                remaining={data.remaining}
                status={data.status}
                lastUpdated={data.lastUpdated}
                lastFuelFill={data.lastFuelFill}
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