import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const EXTERNAL_API = 'http://209.38.217.58:8000/api/energyrite-sites';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('🚀 [INTERNAL API] Request received at', new Date().toISOString());
  
  try {
    console.log('🔍 [INTERNAL API] Fetching from external API:', EXTERNAL_API);
    
    const response = await fetch(EXTERNAL_API, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    console.log('📡 [INTERNAL API] External API responded:', response.status, 'in', Date.now() - startTime, 'ms');

    if (!response.ok) {
      console.error('❌ [INTERNAL API] External API error:', response.status, response.statusText);
      return NextResponse.json(
        { success: true, data: [] }, // Return empty array instead of error
        { status: 200 }
      );
    }

    const data = await response.json();
    console.log('✅ [INTERNAL API] Received data:', Array.isArray(data) ? data.length : 0, 'vehicles');

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

    console.log('🔄 [INTERNAL API] Normalized:', normalized.length, 'vehicles in', Date.now() - startTime, 'ms');

    return NextResponse.json({ success: true, data: normalized });
  } catch (error: any) {
    console.error('❌ [INTERNAL API] Error after', Date.now() - startTime, 'ms:', error.message);
    return NextResponse.json(
      { success: true, data: [] }, // Return empty array on error
      { status: 200 }
    );
  }
}
