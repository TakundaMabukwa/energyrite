import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const EXTERNAL_API_URL = 'http://209.38.217.58:8000/api/energyrite-sites';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plate, ip_address, cost_code, tank_size } = body;

    if (!plate || !cost_code || !tank_size) {
      return NextResponse.json(
        { success: false, error: 'plate, cost_code, and tank_size are required' },
        { status: 400 }
      );
    }

    // Call external API with timeout
    const externalPayload = {
      plate,
      reg: plate,
      ip_address: ip_address || '',
      cost_code
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const externalResponse = await fetch(EXTERNAL_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(externalPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!externalResponse.ok) {
        throw new Error(`External API failed: ${externalResponse.status}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json(
          { success: false, error: 'External API request timed out' },
          { status: 504 }
        );
      }
      throw error;
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Save to Supabase lookup table
    const { error: lookupError } = await supabase
      .from('energyrite_vehicle_lookup')
      .insert({ plate, cost_code });

    if (lookupError) {
      console.error('Supabase lookup error:', lookupError);
    }

    // Save tank size to vehicle_settings
    const { error: settingsError } = await supabase
      .from('vehicle_settings')
      .upsert(
        { vehicle_id: plate, tank_size: parseFloat(tank_size) },
        { onConflict: 'vehicle_id' }
      );

    if (settingsError) {
      console.error('Supabase settings error:', settingsError);
    }

    return NextResponse.json({ success: true, data: { plate } });
  } catch (error) {
    console.error('Error in energyrite-sites POST:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const plate = searchParams.get('plate');

    if (!plate) {
      return NextResponse.json(
        { success: false, error: 'plate is required' },
        { status: 400 }
      );
    }

    // Get the vehicle data by plate to find the ID
    const getResponse = await fetch(`${EXTERNAL_API_URL}/${encodeURIComponent(plate)}`);
    
    if (!getResponse.ok) {
      console.error('Failed to get vehicle:', getResponse.status);
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    const vehicleData = await getResponse.json();
    const vehicleId = vehicleData.Id;

    // Delete from external API using ID
    const deleteResponse = await fetch(`${EXTERNAL_API_URL}/${vehicleId}`, {
      method: 'DELETE'
    });

    if (!deleteResponse.ok) {
      console.error('External API delete failed:', deleteResponse.status);
      return NextResponse.json(
        { success: false, error: 'Failed to delete from external API' },
        { status: 500 }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Delete from Supabase lookup table
    await supabase
      .from('energyrite_vehicle_lookup')
      .delete()
      .eq('plate', plate);

    // Delete from vehicle_settings
    await supabase
      .from('vehicle_settings')
      .delete()
      .eq('vehicle_id', plate);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in energyrite-sites DELETE:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
