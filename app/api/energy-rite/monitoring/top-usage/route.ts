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
    const days = parseInt(searchParams.get('days') || '30');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const client = await pool.connect();
    
    try {
      const whereClause = costCode ? 'WHERE cost_code = $1' : '';
      const queryParams = costCode ? [costCode] : [];
      
      const topUsageQuery = `
        SELECT 
          branch as location,
          cost_code,
          COALESCE(SUM(CASE 
            WHEN fuel_probe_1_volume_in_tank IS NOT NULL AND fuel_probe_1_volume_in_tank > 0 
            THEN fuel_probe_1_volume_in_tank 
            WHEN fuel_probe_2_volume_in_tank IS NOT NULL AND fuel_probe_2_volume_in_tank > 0 
            THEN fuel_probe_2_volume_in_tank 
            ELSE 0 
          END), 0) as total_fuel_consumed,
          COUNT(*) as total_sessions,
          COALESCE(AVG(CASE 
            WHEN activity_duration_hours IS NOT NULL AND activity_duration_hours > 0 
            THEN activity_duration_hours 
            ELSE 0 
          END), 0) as avg_session_duration,
          MAX(updated_at) as last_activity
        FROM energyrite_vehicles 
        ${whereClause}
        AND updated_at >= NOW() - INTERVAL '${days} days'
        GROUP BY branch, cost_code
        ORDER BY total_fuel_consumed DESC
        LIMIT ${limit}
      `;
      
      const result = await client.query(topUsageQuery, queryParams);
      
      return NextResponse.json({
        success: true,
        data: {
          top_usage_sites: result.rows,
          cost_code_filter: costCode || null,
          summary: {
            total_sites_analyzed: result.rows.length,
            highest_consumer: result.rows[0] || null
          }
        }
      });
      
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch top usage data' },
      { status: 500 }
    );
  }
}