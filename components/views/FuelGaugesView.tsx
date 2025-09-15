'use client';

import React, { useState, useEffect } from 'react';
import { FuelGauge } from '@/components/ui/fuel-gauge';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings, Download, RefreshCw, Fuel } from 'lucide-react';

interface FuelGaugesViewProps {
  onBack: () => void;
}

interface FuelConsumptionData {
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
}

export function FuelGaugesView({ onBack }: FuelGaugesViewProps) {
  const { fuelData, selectedRoute } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fuelConsumptionData, setFuelConsumptionData] = useState<FuelConsumptionData[]>([]);

  // Fetch vehicle data from Energy Rite server
  const fetchFuelData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if we have a selected route (cost center) to filter by
      if (selectedRoute && (selectedRoute as any).costCode) {
        console.log('📊 Fetching vehicle data for cost center:', (selectedRoute as any).costCode);
        
        // Use the cost code endpoint to get specific vehicles via proxy
        const response = await fetch(`/api/energy-rite-proxy?endpoint=/api/energy-rite-vehicles/by-cost-code&costCode=${(selectedRoute as any).costCode}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📥 Cost code API response:', result);
        
        if (result.success && result.data && Array.isArray(result.data)) {
          // Convert vehicle data to fuel consumption format
          const fuelData: FuelConsumptionData[] = result.data.map((vehicle: any, index: number) => ({
            id: vehicle.id || `vehicle-${index + 1}`,
            plate: vehicle.plate || 'Unknown Plate',
            branch: vehicle.branch || 'Unknown Branch',
            company: vehicle.company || 'Unknown Company',
            fuel_probe_1_level_percentage: vehicle.fuel_probe_1_level || 0,
            fuel_probe_1_volume_in_tank: parseFloat(vehicle.volume) || 0,
            fuel_probe_2_level_percentage: vehicle.fuel_probe_2_level || 0,
            fuel_probe_2_volume_in_tank: vehicle.fuel_probe_2_volume_in_tank || 0,
            current_status: vehicle.status || 'Unknown',
            last_message_date: vehicle.last_message_date || vehicle.updated_at || new Date().toISOString(),
            fuel_anomaly: vehicle.theft || false,
            fuel_anomaly_note: vehicle.theft_time ? `Theft detected at ${vehicle.theft_time}` : ''
          }));
          
          setFuelConsumptionData(fuelData);
          console.log('✅ Vehicle data loaded for cost center:', fuelData.length, 'vehicles');
          console.log('📊 Vehicle data:', fuelData);
        } else {
          console.log('⚠️ No vehicle data found for cost code:', (selectedRoute as any).costCode);
          setFuelConsumptionData([]);
        }
      } else {
        console.log('📊 Fetching all vehicles from Energy Rite API...');
        
        // Use the all vehicles endpoint as fallback via proxy
        const response = await fetch('/api/energy-rite-proxy?endpoint=/api/energy-rite-vehicles');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📥 All vehicles API response:', result);
        
        if (result.success && result.data && Array.isArray(result.data)) {
          // Convert vehicle data to fuel consumption format
          const fuelData: FuelConsumptionData[] = result.data.map((vehicle: any, index: number) => ({
            id: vehicle.id || `vehicle-${index + 1}`,
            plate: vehicle.plate || 'Unknown Plate',
            branch: vehicle.branch || 'Unknown Branch',
            company: vehicle.company || 'Unknown Company',
            fuel_probe_1_level_percentage: vehicle.fuel_probe_1_level || 0,
            fuel_probe_1_volume_in_tank: parseFloat(vehicle.volume) || 0,
            fuel_probe_2_level_percentage: vehicle.fuel_probe_2_level || 0,
            fuel_probe_2_volume_in_tank: vehicle.fuel_probe_2_volume_in_tank || 0,
            current_status: vehicle.status || 'Unknown',
            last_message_date: vehicle.last_message_date || vehicle.updated_at || new Date().toISOString(),
            fuel_anomaly: vehicle.theft || false,
            fuel_anomaly_note: vehicle.theft_time ? `Theft detected at ${vehicle.theft_time}` : ''
          }));
          
          setFuelConsumptionData(fuelData);
          console.log('✅ All vehicles data loaded:', fuelData.length, 'vehicles');
          console.log('📊 All vehicles data:', fuelData);
        } else {
          console.log('⚠️ No vehicle data found in API response');
          setFuelConsumptionData([]);
        }
      }
    } catch (err) {
      console.error('❌ Error fetching vehicle data:', err);
      setError('Failed to load vehicle data. Please try again.');
      setFuelConsumptionData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFuelData();
  }, [selectedRoute]);

  // Convert fuel consumption data to fuel gauge format
  const getFuelGaugeData = () => {
    return fuelConsumptionData.map((vehicle, index) => ({
      id: vehicle.id || index + 1,
      location: vehicle.branch || vehicle.plate || 'Unknown Location',
      fuelLevel: vehicle.fuel_probe_1_level_percentage || 0,
      temperature: 25, // Default temperature
      volume: vehicle.fuel_probe_1_volume_in_tank || 0,
      remaining: vehicle.fuel_probe_1_volume_in_tank || 0,
      status: vehicle.current_status || 'active',
      lastUpdated: vehicle.last_message_date || new Date().toLocaleString(),
      anomaly: !!vehicle.fuel_anomaly,
      anomalyNote: vehicle.fuel_anomaly_note || ''
    }));
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
      {/* Header */}
      <div className="bg-white p-6 border-gray-200 border-b">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="mr-2 w-4 h-4" />
              Back to Routes
            </Button>
            <div>
              <h1 className="font-semibold text-gray-900 text-2xl">Fuel Monitoring</h1>
              {selectedRoute && (
                <p className="mt-1 text-gray-600 text-sm">
                  {(selectedRoute as any).costCode ? 
                    `Cost Center: ${(selectedRoute as any).costCode} - ${(selectedRoute as any).name}` :
                    `Route ${selectedRoute.route} - Location ${selectedRoute.locationCode}`
                  }
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={fetchFuelData}>
              <RefreshCw className="mr-2 w-4 h-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 w-4 h-4" />
              Export Data
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="mr-2 w-4 h-4" />
              Configure
            </Button>
            {fuelConsumptionData.length > 0 && (
              <div className="text-gray-500 text-sm">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gauges Grid */}
      <div className="p-6">
        {fuelConsumptionData.length > 0 ? (
          <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 xl:grid-cols-4">
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