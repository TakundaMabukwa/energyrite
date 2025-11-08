import { NextRequest } from 'next/server';
import { Pool } from 'pg';

export const runtime = 'nodejs';

// Build connection string from multiple env sources with validation
function resolveConnectionString(): string | undefined {
  if (process.env.DATABASE_URL && typeof process.env.DATABASE_URL === 'string') {
    return process.env.DATABASE_URL;
  }
  const dbHost = process.env.DB_HOST || process.env.PGHOST;
  const dbPort = process.env.DB_PORT || process.env.PGPORT || '5432';
  const dbName = process.env.DB_NAME || process.env.PGDATABASE;
  const dbUser = process.env.DB_USER || process.env.PGUSER;
  const dbPassword = process.env.DB_PASSWORD || process.env.PGPASSWORD;
  if (dbHost && dbName && dbUser && typeof dbPassword === 'string') {
    return `postgresql://${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;
  }
  return undefined;
}

// TEMP hardcoded connection for debugging
const hardcodedConnectionString = 'postgresql://app_user:b9fefea2-97c9-4468-8764-503c14e664bd@64.227.138.235:5432/vehicles';
const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined;

const pool = new Pool({ connectionString: hardcodedConnectionString, ssl: ssl as any });

function sseFormat(event: string | null, data: unknown) {
  const payload = `data: ${JSON.stringify(data)}\n`;
  return event ? `event: ${event}\n${payload}\n` : `${payload}\n`;
}

export async function GET(request: NextRequest) {
  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      const encoder = new TextEncoder();
      let client: any;
      let heartbeatTimer: any;
      const abortHandler = async () => {
        try {
          if (client) {
            client.removeAllListeners?.('notification');
            try { await client.query('UNLISTEN energyrite_vehicles_updated'); } catch {}
            client.release();
          }
        } catch {}
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
        }
        controller.close();
      };

      request.signal.addEventListener('abort', abortHandler);

      try {
        client = await pool.connect();

        // Send initial comment to keep connection alive and mark SSE
        controller.enqueue(encoder.encode(': connected\n\n'));

        // Send initial dataset
        try {
          const initialResult = await client.query(`
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
              client_notes
            FROM energyrite_vehicles 
            ORDER BY updated_at DESC 
            LIMIT 50
          `);

          const initPayload = {
            type: 'initial',
            data: initialResult.rows,
            timestamp: new Date().toISOString(),
          };
          controller.enqueue(encoder.encode(sseFormat('message', initPayload)));
          console.log(`📊 SSE initial: ${initialResult.rows.length} rows sent`);
          if (initialResult.rows.length > 0) {
            const sample = { ...initialResult.rows[0] } as any;
            // Avoid logging very large fields
            Object.keys(sample).forEach((k) => {
              const v = sample[k];
              if (typeof v === 'string' && v.length > 200) sample[k] = `${v.slice(0, 200)}…`;
            });
            console.log('🧪 SSE initial sample row keys:', Object.keys(sample));
          }
        } catch (e: any) {
          const errPayload = { type: 'error', message: e?.message || 'Failed to fetch initial data' };
          controller.enqueue(encoder.encode(sseFormat('error', errPayload)));
          console.error('❌ SSE initial query error:', e?.message || e);
        }

        // Listen to notifications
        await client.query('LISTEN energyrite_vehicles_updated');
        console.log('🔊 SSE listening on channel: energyrite_vehicles_updated');
        client.on('notification', (msg: any) => {
          try {
            const parsed = msg?.payload ? JSON.parse(msg.payload) : {};
            const payload = {
              type: parsed.type || 'update',
              ...parsed,
              timestamp: new Date().toISOString(),
            };
            controller.enqueue(encoder.encode(sseFormat('message', payload)));
            const summary = typeof parsed === 'object' && parsed ? Object.keys(parsed) : typeof parsed;
            console.log('📡 SSE notification received:', summary);
          } catch (err: any) {
            const errPayload = { type: 'error', message: err?.message || 'Failed to parse notification' };
            controller.enqueue(encoder.encode(sseFormat('error', errPayload)));
            console.error('❌ SSE notification parse error:', err?.message || err);
          }
        });

        // Heartbeat to keep proxies from timing out idle connections
        heartbeatTimer = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': heartbeat\n\n'));
          } catch {}
        }, 15000);
      } catch (error: any) {
        const errPayload = { type: 'error', message: error?.message || 'Database connection error' };
        controller.enqueue(encoder.encode(sseFormat('error', errPayload)));
        controller.close();
        console.error('❌ SSE connection error:', error?.message || error);
      }
    },
    cancel: () => {
      // handled by abort handler
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


