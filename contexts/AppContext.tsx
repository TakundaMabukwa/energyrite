'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { costCenterService, HierarchicalCostCenter } from '@/lib/supabase/cost-centers';

interface Route {
  id: string;
  route: string;
  locationCode: string;
  serviceDays: string[];
  userGroup: string;
  created: string;
}

interface FuelData {
  id: string;
  location: string;
  fuelLevel: number;
  temperature: number;
  volume: number;
  remaining: string;
  status: string;
  lastUpdated: string;
}

// Use the HierarchicalCostCenter from the service
type CostCenter = HierarchicalCostCenter;

interface AppContextType {
  routes: Route[];
  fuelData: FuelData[];
  vehicles: EnergyRiteVehicle[];
  costCenters: CostCenter[];
  selectedRoute: Route | null;
  activeTab: string;
  sidebarCollapsed: boolean;
  setRoutes: (routes: Route[]) => void;
  setFuelData: (fuelData: FuelData[]) => void;
  setVehicles: (vehicles: EnergyRiteVehicle[]) => void;
  setCostCenters: (costCenters: CostCenter[]) => void;
  setSelectedRoute: (route: Route | null) => void;
  setActiveTab: (tab: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  updateFuelDataForCostCenter: (costCenter: CostCenter) => Promise<void>;
  loading: boolean;
  sseConnected: boolean;
  lastSseUpdate?: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [routes, setRoutes] = useState<Route[]>([]);
  const [fuelData, setFuelData] = useState<FuelData[]>([]);
  const [vehicles, setVehicles] = useState<EnergyRiteVehicle[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sseConnected, setSseConnected] = useState(false);
  const [lastSseUpdate, setLastSseUpdate] = useState<string | null>(null);

  // Handle URL parameters for navigation
  useEffect(() => {
    const tab = searchParams.get('tab');
    const route = searchParams.get('route');
    const view = searchParams.get('view');
    
    if (tab && ['dashboard', 'store', 'cost-centres'].includes(tab)) {
      setActiveTab(tab);
    }
    
    if (route) {
      const foundRoute = routes.find(r => r.id === route);
      if (foundRoute) {
        setSelectedRoute(foundRoute);
      }
    }
  }, [searchParams, routes]);

  // Update URL when activeTab changes
  const updateActiveTab = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Update URL when selectedRoute changes
  const updateSelectedRoute = (route: Route | null) => {
    setSelectedRoute(route);
    const params = new URLSearchParams(searchParams.toString());
    if (route) {
      params.set('route', route.id);
    } else {
      params.delete('route');
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Update fuel data using vehicles from SSE/context (filter by cost code)
  const updateFuelDataForCostCenter = async (costCenter: CostCenter) => {
    try {
      console.log('📊 Fetching vehicle data for cost center:', costCenter.costCode);
      
      if (!costCenter.costCode) {
        console.log('⚠️ No cost code available for this cost center');
        setFuelData([]);
        return;
      }
      
      // Filter from in-memory vehicles
      let filteredVehicles: any[] = (vehicles as any[]).filter((v: any) => v.cost_code === costCenter.costCode);

      if ((!filteredVehicles || filteredVehicles.length === 0) && (!vehicles || vehicles.length === 0)) {
        // Load vehicles once if not present, then filter
        try {
          const resp = await fetch('/api/energy-rite-proxy?endpoint=/api/energy-rite/vehicles');
          if (resp.ok) {
            const json = await resp.json();
            if (json?.success && Array.isArray(json.data)) {
              setVehicles(json.data);
              filteredVehicles = json.data.filter((v: any) => v.cost_code === costCenter.costCode);
            }
          }
        } catch {}
      }

      if (filteredVehicles && filteredVehicles.length > 0) {
        const formattedFuelData: FuelData[] = filteredVehicles.map((vehicle: any, index: number) => {
          const percentage = Number(vehicle.fuel_probe_1_level_percentage ?? vehicle.fuel_probe_1_level ?? 0);
          // Treat `volume` as TANK CAPACITY. Do NOT use feed remaining directly.
          const capacity = Number(typeof vehicle.volume === 'number' ? vehicle.volume : vehicle.volume ?? 0);
          const remainingLiters = (Number.isFinite(capacity) && Number.isFinite(percentage))
            ? (capacity * (percentage / 100))
            : 0;

          return ({
            id: vehicle.id || `vehicle-${index + 1}`,
            location: vehicle.branch || vehicle.plate || 'Unknown Vehicle',
            fuelLevel: Math.max(0, Math.min(100, Number(percentage) || 0)),
            temperature: Number(vehicle.fuel_probe_1_temperature ?? 25),
            volume: Math.max(0, Number(capacity || 0)),
            remaining: `${Math.max(0, Number(capacity || 0)).toFixed(1)}L / ${Math.max(0, Number(remainingLiters || 0)).toFixed(1)}L`,
            status: vehicle.status || 'Unknown',
            lastUpdated: vehicle.last_message_date || vehicle.updated_at || new Date().toLocaleString()
          });
        });

        setFuelData(formattedFuelData);
        console.log('✅ Updated fuel data from SSE/context vehicles:', formattedFuelData.length, 'vehicles');
      } else {
        console.log('⚠️ No vehicle data found for cost code in context:', costCenter.costCode, '→ fetching vehicles from external once');
        const resp = await fetch('/api/energy-rite-proxy?endpoint=/api/energy-rite/vehicles');
        if (resp.ok) {
          const json = await resp.json();
          if (json?.success && Array.isArray(json.data)) {
            setVehicles(json.data);
            filteredVehicles = json.data.filter((v: any) => v.cost_code === costCenter.costCode);
            const formattedFuelData: FuelData[] = filteredVehicles.map((vehicle: any, index: number) => ({
              id: vehicle.id || `vehicle-${index + 1}`,
              location: vehicle.branch || vehicle.plate || 'Unknown Vehicle',
              fuelLevel: Number(vehicle.fuel_probe_1_level ?? vehicle.fuel_probe_1_level_percentage ?? 0),
              temperature: Number(vehicle.fuel_probe_1_temperature ?? 25),
              volume: Number(typeof vehicle.volume === 'number' ? vehicle.volume : (vehicle.fuel_probe_1_volume_in_tank ?? vehicle.volume ?? 0)),
              remaining: `${Number(typeof vehicle.volume === 'number' ? vehicle.volume : (vehicle.fuel_probe_1_volume_in_tank ?? vehicle.volume ?? 0))}L`,
              status: vehicle.status || 'Unknown',
              lastUpdated: vehicle.last_message_date || vehicle.updated_at || new Date().toLocaleString()
            }));
            setFuelData(formattedFuelData);
            console.log('✅ Updated fuel data from local API:', formattedFuelData.length, 'vehicles');
          } else {
            console.log('⚠️ Local API returned no data for cost code:', costCenter.costCode);
            setFuelData([]);
          }
        } else {
          console.warn('⚠️ Local API error:', resp.status);
          setFuelData([]);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching vehicle data for cost center:', error);
      
      // Set dummy fuel data when API fails
      const dummyFuelData: FuelData[] = [
        {
          id: 'vehicle-1',
          location: 'Johannesburg - SPUR THUVL',
          fuelLevel: 78,
          temperature: 24,
          volume: 125.5,
          remaining: '125.5L',
          status: 'Active',
          lastUpdated: new Date().toLocaleString()
        },
        {
          id: 'vehicle-2',
          location: 'Cape Town - KFC WEST',
          fuelLevel: 65,
          temperature: 22,
          volume: 98.2,
          remaining: '98.2L',
          status: 'Active',
          lastUpdated: new Date().toLocaleString()
        },
        {
          id: 'vehicle-3',
          location: 'Durban - MUSHROOM',
          fuelLevel: 82,
          temperature: 26,
          volume: 145.8,
          remaining: '145.8L',
          status: 'Active',
          lastUpdated: new Date().toLocaleString()
        },
        {
          id: 'vehicle-4',
          location: 'Pretoria - SPUR CENTRAL',
          fuelLevel: 45,
          temperature: 25,
          volume: 67.3,
          remaining: '67.3L',
          status: 'Low Fuel',
          lastUpdated: new Date().toLocaleString()
        },
        {
          id: 'vehicle-5',
          location: 'Port Elizabeth - KFC EAST',
          fuelLevel: 91,
          temperature: 23,
          volume: 156.7,
          remaining: '156.7L',
          status: 'Active',
          lastUpdated: new Date().toLocaleString()
        }
      ];
      
      setFuelData(dummyFuelData);
      console.log('🔄 Using dummy fuel data due to API error');
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        
        // Fetch cost centers from Supabase
        console.log('🚀 Starting to fetch cost centers from Supabase...');
        const costCentersData = await costCenterService.fetchAllCostCenters();
        console.log('✅ Cost centers fetched and set in context:', costCentersData);
        setCostCenters(costCentersData);
        
        // Keep mock data for routes and fuel data for now
        const mockRoutes: Route[] = [
          {
            id: '1',
            route: '845DA2',
            locationCode: '8459201',
            serviceDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            userGroup: '845',
            created: '9/2/2025'
          },
          {
            id: '2',
            route: '845DA3',
            locationCode: '8459202',
            serviceDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            userGroup: '845',
            created: '9/2/2025'
          },
          {
            id: '3',
            route: '845DA4',
            locationCode: '8459301',
            serviceDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday'],
            userGroup: '845',
            created: '9/2/2025'
          }
        ];

        const mockFuelData: FuelData[] = [
          {
            id: '1',
            location: 'BLUE HILL',
            fuelLevel: 71,
            temperature: 28,
            volume: 972.0,
            remaining: '696.7L',
            status: 'ENGINE OFF',
            lastUpdated: '28 Aug 2025 14:37 PM'
          },
          {
            id: '2',
            location: 'KFC Ballyclare',
            fuelLevel: 95,
            temperature: 32,
            volume: 484.3,
            remaining: '463.9L',
            status: 'Possible Fuel Fill',
            lastUpdated: '29 Aug 2025 16:22 PM'
          },
          {
            id: '3',
            location: 'KFC KAALFONTEIN',
            fuelLevel: 94,
            temperature: 30,
            volume: 520.0,
            remaining: '488.8L',
            status: 'ENGINE OFF',
            lastUpdated: '28 Aug 2025 15:45 PM'
          },
          {
            id: '4',
            location: 'KYALAMI - (Water contaminated generator)',
            fuelLevel: 102,
            temperature: 215,
            volume: 750.0,
            remaining: '765.0L',
            status: 'ENGINE OFF',
            lastUpdated: '27 Aug 2025 11:30 AM'
          },
          {
            id: '5',
            location: 'LION\'S PRIDE',
            fuelLevel: 97,
            temperature: 25,
            volume: 680.0,
            remaining: '659.6L',
            status: 'ENGINE OFF',
            lastUpdated: '29 Aug 2025 09:15 AM'
          },
          {
            id: '6',
            location: 'MARLBORO',
            fuelLevel: 92,
            temperature: 27,
            volume: 450.0,
            remaining: '414.0L',
            status: 'ENGINE OFF',
            lastUpdated: '28 Aug 2025 13:20 PM'
          }
        ];

        setRoutes(mockRoutes);
        setFuelData(mockFuelData);

        // Load vehicles once from external endpoint via proxy (non-realtime)
        try {
          console.log('🚚 Fetching all vehicles from Energy Rite via proxy...');
          const resp = await fetch('/api/energy-rite-proxy?endpoint=/api/energy-rite/vehicles');
          if (resp.ok) {
            const json = await resp.json();
            if (json?.success && Array.isArray(json.data)) {
              setVehicles(json.data);
              setLastSseUpdate(new Date().toISOString());
              console.log('✅ Loaded vehicles:', json.data.length);
            } else {
              console.warn('⚠️ Vehicles API returned no data');
            }
          } else {
            console.warn('⚠️ Vehicles API error:', resp.status);
          }
        } catch (vehErr) {
          console.error('❌ Error loading vehicles:', vehErr);
        }
      } catch (error) {
        console.error('Error initializing data:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  // Realtime disabled: we fetch once on load per requirements

  return (
    <AppContext.Provider
      value={{
        routes,
        fuelData,
        vehicles,
        costCenters,
        selectedRoute,
        activeTab,
        sidebarCollapsed,
        setRoutes,
        setFuelData,
        setVehicles,
        setCostCenters,
        setSelectedRoute: updateSelectedRoute,
        setActiveTab: updateActiveTab,
        setSidebarCollapsed,
        updateFuelDataForCostCenter,
        loading,
        sseConnected,
        lastSseUpdate
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Minimal vehicle type capturing known fields from the table; allows additional fields
export interface EnergyRiteVehicle {
  id?: string | number;
  plate?: string;
  branch?: string;
  company?: string;
  cost_code?: string;
  speed?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  fuel_probe_1_level?: number | null;
  fuel_probe_1_volume_in_tank?: number | null;
  fuel_probe_1_temperature?: number | null;
  fuel_probe_1_level_percentage?: number | null;
  fuel_probe_2_level?: number | null;
  fuel_probe_2_volume_in_tank?: number | null;
  fuel_probe_2_temperature?: number | null;
  fuel_probe_2_level_percentage?: number | null;
  is_active?: boolean | null;
  volume?: number | string | null;
  status?: string | null;
  last_notification?: string | null;
  [key: string]: any;
}