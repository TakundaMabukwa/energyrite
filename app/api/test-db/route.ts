import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export const runtime = 'nodejs';

function resolveConnectionString(): string | undefined {
  if (process.env.DATABASE_URL && typeof process.env.DATABASE_URL === 'string') {
    return process.env.DATABASE_URL;
  }
  const dbHost = process.env.DB_HOST || process.env.PGHOST || process.env.PG_HOST;
  const dbPort = process.env.DB_PORT || process.env.PGPORT || process.env.PG_PORT || '5432';
  const dbName = process.env.DB_NAME || process.env.PGDATABASE || process.env.PG_DATABASE;
  const dbUser = process.env.DB_USER || process.env.PGUSER || process.env.PG_USER;
  const dbPassword = process.env.DB_PASSWORD || process.env.PGPASSWORD || process.env.PG_PASSWORD;
  if (dbHost && dbName && dbUser && typeof dbPassword === 'string') {
    return `postgresql://${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;
  }
  return undefined;
}

// TEMP hardcoded connection for debugging
const hardcodedConnectionString = 'postgresql://app_user:b9fefea2-97c9-4468-8764-503c14e664bd@64.227.138.235:5432/vehicles';
const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined;

const pool = new Pool({ connectionString: hardcodedConnectionString, ssl: ssl as any });

export async function GET() {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT COUNT(*)::int AS count FROM energyrite_vehicles');
      const count = result.rows?.[0]?.count ?? 0;
      return NextResponse.json({ success: true, message: 'Database connection successful', recordCount: count });
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}


