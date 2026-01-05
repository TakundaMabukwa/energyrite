import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const EXTERNAL_API = 'http://209.38.217.58:8000/api/energyrite-sites';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching vehicles from external API:', EXTERNAL_API);
    
    const response = await fetch(EXTERNAL_API, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('❌ External API error:', response.status, response.statusText);
      return NextResponse.json(
        { success: false, error: 'External API error' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Received data from external API:', Array.isArray(data) ? data.length : 0, 'vehicles');

    // Transform capitalized keys to lowercase
    const normalized = Array.isArray(data) ? data.map((vehicle: any) => ({
      id: vehicle.Id,
      plate: vehicle.Plate || vehicle.plate,
      branch: vehicle.Plate || vehicle.branch,
      company: vehicle.company,
      cost_code: vehicle.cost_code,
      speed: vehicle.Speed,
      latitude: vehicle.Latitude,
      longitude: vehicle.Longitude,
      address: vehicle.Geozone || vehicle.address,
      drivername: vehicle.DriverName || vehicle.drivername,
      fuel_probe_1_level: vehicle.fuel_probe_1_level,
      fuel_probe_1_volume_in_tank: vehicle.fuel_probe_1_volume_in_tank,
      fuel_probe_1_temperature: vehicle.fuel_probe_1_temperature,
      fuel_probe_1_level_percentage: vehicle.fuel_probe_1_level_percentage,
      volume: vehicle.fuel_probe_1_volume_in_tank || vehicle.volume,
      loctime: vehicle.LocTime,
      last_message_date: vehicle.LocTime || vehicle.last_message_date || new Date().toISOString(),
      updated_at: vehicle.updated_at || new Date().toISOString(),
      color_codes: vehicle.color_codes || {},
      client_notes: vehicle.client_notes,
    })) : [];

    console.log('🔄 Normalized data:', normalized.length, 'vehicles');

    return NextResponse.json({ success: true, data: normalized });
  } catch (error: any) {
    console.error('❌ Error fetching vehicles:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
}
