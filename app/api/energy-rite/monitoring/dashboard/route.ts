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
    
    const client = await pool.connect();
    
    try {
      const whereClause = costCode ? 'WHERE cost_code = $1 AND updated_at >= NOW() - INTERVAL \'24 hours\'' : 'WHERE updated_at >= NOW() - INTERVAL \'24 hours\'';
      const queryParams = costCode ? [costCode] : [];
      
      const dashboardQuery = `
        SELECT 
          COUNT(DISTINCT id) as active_sites,
          COUNT(*) as total_sessions_24h,
          COALESCE(SUM(CASE 
            WHEN fuel_probe_1_volume_in_tank IS NOT NULL AND fuel_probe_1_volume_in_tank > 0 
            THEN fuel_probe_1_volume_in_tank 
            WHEN fuel_probe_2_volume_in_tank IS NOT NULL AND fuel_probe_2_volume_in_tank > 0 
            THEN fuel_probe_2_volume_in_tank 
            ELSE 0 
          END), 0) as total_fuel_consumed_24h,
          COALESCE(AVG(CASE 
            WHEN activity_duration_hours IS NOT NULL AND activity_duration_hours > 0 
            THEN activity_duration_hours 
            ELSE 0 
          END), 0) as avg_session_duration_24h,
          COUNT(CASE WHEN fuel_anomaly = true THEN 1 END) as sites_with_anomalies
        FROM energyrite_vehicles 
        ${whereClause}
      `;
      
      const result = await client.query(dashboardQuery, queryParams);
      const dashboardData = result.rows[0];
      
      return NextResponse.json({
        success: true,
        data: {
          active_sites: parseInt(dashboardData.active_sites) || 0,
          total_sessions_24h: parseInt(dashboardData.total_sessions_24h) || 0,
          total_fuel_consumed_24h: parseFloat(dashboardData.total_fuel_consumed_24h) || 0,
          avg_session_duration_24h: parseFloat(dashboardData.avg_session_duration_24h) || 0,
          sites_with_anomalies: parseInt(dashboardData.sites_with_anomalies) || 0,
          cost_code_filter: costCode || null
        }
      });
      
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}