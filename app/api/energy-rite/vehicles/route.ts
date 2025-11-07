import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const runtime = 'nodejs';

// TEMP hardcoded connection for debugging
const connectionString = 'postgresql://app_user:b9fefea2-97c9-4468-8764-503c14e664bd@64.227.138.235:5432/vehicles';
const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined;
const pool = new Pool({ connectionString, ssl: ssl as any });

function buildWhereClause(params: URLSearchParams) {
  const clauses: string[] = [];
  const values: any[] = [];

  const costCode = params.get('costCode');
  const plate = params.get('plate');
  const company = params.get('company');
  const branch = params.get('branch');
  const hasFuel = params.get('hasFuel');

  if (costCode) {
    clauses.push(`cost_code = $${values.length + 1}`);
    values.push(costCode);
  }
  if (plate) {
    clauses.push(`plate = $${values.length + 1}`);
    values.push(plate);
  }
  if (company) {
    clauses.push(`company = $${values.length + 1}`);
    values.push(company);
  }
  if (branch) {
    clauses.push(`branch = $${values.length + 1}`);
    values.push(branch);
  }
  if (hasFuel === 'true') {
    clauses.push(`(fuel_probe_1_level IS NOT NULL OR fuel_probe_1_volume_in_tank IS NOT NULL OR fuel_probe_2_level IS NOT NULL OR fuel_probe_2_volume_in_tank IS NOT NULL)`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return { where, values };
}

function sseFormat(event: string | null, data: unknown) {
  const payload = `data: ${JSON.stringify(data)}\n`;
  return event ? `event: ${event}\n${payload}\n` : `${payload}\n`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const realtime = searchParams.get('realtime') === 'true';
  const limit = Math.max(1, Math.min(500, Number(searchParams.get('limit') || '50')));

  const { where, values } = buildWhereClause(searchParams);

  const baseSelect = `
    SELECT 
      id,
      branch,
      company,
      plate,
      ip_address,
      cost_code,
      speed,
      latitude,
      longitude,
      loctime,
      quality,
      mileage,
      pocsagstr,
      head,
      geozone,
      drivername,
      nameevent,
      temperature,
      address,
      fuel_probe_1_level,
      fuel_probe_1_volume_in_tank,
      fuel_probe_1_temperature,
      fuel_probe_1_level_percentage,
      fuel_probe_2_level,
      fuel_probe_2_volume_in_tank,
      fuel_probe_2_temperature,
      fuel_probe_2_level_percentage,
      status,
      last_message_date,
      updated_at,
      volume,
      theft,
      theft_time,
      previous_fuel_level,
      previous_fuel_time,
      activity_start_time,
      activity_duration_hours,
      total_usage_hours,
      daily_usage_hours,
      is_active,
      last_activity_time,
      fuel_anomaly,
      fuel_anomaly_note,
      last_anomaly_time,
      created_at,
      notes
    FROM energyrite_vehicles
    ${where}
    ORDER BY updated_at DESC
    LIMIT ${limit}
  `;

  if (!realtime) {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(baseSelect, values);
        return NextResponse.json({ success: true, data: result.rows });
      } finally {
        client.release();
      }
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error?.message || 'Query failed' }, { status: 500 });
    }
  }

  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      const encoder = new TextEncoder();
      let client: any;
      let heartbeatTimer: any;
      const closeAll = async () => {
        try {
          if (client) {
            client.removeAllListeners?.('notification');
            try { await client.query('UNLISTEN energyrite_vehicles_updated'); } catch {}
            client.release();
          }
        } catch {}
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        controller.close();
      };

      request.signal.addEventListener('abort', closeAll);

      try {
        client = await pool.connect();
        controller.enqueue(encoder.encode(': connected\n\n'));

        // Initial
        try {
          const result = await client.query(baseSelect, values);
          controller.enqueue(encoder.encode(sseFormat('message', {
            type: 'initial',
            data: result.rows,
            timestamp: new Date().toISOString(),
          })));
        } catch (e: any) {
          controller.enqueue(encoder.encode(sseFormat('error', { type: 'error', message: e?.message || 'Initial query failed' })));
        }

        await client.query('LISTEN energyrite_vehicles_updated');
        client.on('notification', (msg: any) => {
          try {
            const parsed = msg?.payload ? JSON.parse(msg.payload) : {};
            controller.enqueue(encoder.encode(sseFormat('message', {
              type: parsed.type || 'vehicle_update',
              ...parsed,
              timestamp: new Date().toISOString(),
            })));
          } catch (err: any) {
            controller.enqueue(encoder.encode(sseFormat('error', { type: 'error', message: err?.message || 'Notification parse failed' })));
          }
        });

        heartbeatTimer = setInterval(() => {
          try { controller.enqueue(encoder.encode(': heartbeat\n\n')); } catch {}
        }, 15000);
      } catch (error: any) {
        controller.enqueue(encoder.encode(sseFormat('error', { type: 'error', message: error?.message || 'DB connection error' })));
        await closeAll();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}


