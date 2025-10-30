import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const runtime = 'nodejs';

const connectionString = 'postgresql://app_user:b9fefea2-97c9-4468-8764-503c14e664bd@64.227.138.235:5432/vehicles';
const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined;
const pool = new Pool({ connectionString, ssl: ssl as any });

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const costCode = searchParams.get('cost_code');
    const hours = parseInt(searchParams.get('hours') || '24');
    
    const client = await pool.connect();
    
    try {
      const whereClause = costCode ? 'WHERE cost_code = $1 AND' : 'WHERE';
      const queryParams = costCode ? [costCode] : [];
      
      const longRunningQuery = `
        SELECT 
          branch as location,
          cost_code,
          COALESCE(activity_duration_hours, 0) as current_session_hours,
          COALESCE(CASE 
            WHEN fuel_probe_1_volume_in_tank IS NOT NULL AND fuel_probe_1_volume_in_tank > 0 
            THEN fuel_probe_1_volume_in_tank 
            WHEN fuel_probe_2_volume_in_tank IS NOT NULL AND fuel_probe_2_volume_in_tank > 0 
            THEN fuel_probe_2_volume_in_tank 
            ELSE 0 
          END, 0) as fuel_consumed_current_session,
          status,
          activity_start_time as session_start
        FROM energyrite_vehicles 
        ${whereClause} activity_duration_hours >= ${hours}
        AND is_active = true
        ORDER BY activity_duration_hours DESC
      `;
      
      const result = await client.query(longRunningQuery, queryParams);
      
      return NextResponse.json({
        success: true,
        data: {
          long_running_sites: result.rows,
          cost_code_filter: costCode || null,
          threshold_hours: hours,
          summary: {
            total_long_running: result.rows.length
          }
        }
      });
      
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch long running data' },
      { status: 500 }
    );
  }
}