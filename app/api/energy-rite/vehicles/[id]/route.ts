import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const runtime = 'nodejs';

// TEMP hardcoded connection for debugging
const connectionString = 'postgresql://app_user:b9fefea2-97c9-4468-8764-503c14e664bd@64.227.138.235:5432/vehicles';
const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined;
const pool = new Pool({ connectionString, ssl: ssl as any });

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    // Build dynamic update query based on provided fields
    const updateFields = [];
    const values = [];
    let paramIndex = 1;
    
    // Define allowed fields that can be updated
    const allowedFields = [
      'branch', 'company', 'cost_code', 'ip_address', 'volume', 'notes',
      'fuel_anomaly_note', 'status', 'client_notes', 'color_codes'
    ];
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        values.push(body[field]);
        paramIndex++;
      }
    }
    
    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields provided for update' },
        { status: 400 }
      );
    }
    
    // Add updated_at timestamp
    updateFields.push(`updated_at = $${paramIndex}`);
    values.push(new Date().toISOString());
    paramIndex++;
    
    // Add id for WHERE clause
    values.push(id);
    
    const updateQuery = `
      UPDATE energyrite_vehicles 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const client = await pool.connect();
    try {
      const result = await client.query(updateQuery, values);
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Vehicle not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: result.rows[0],
        message: 'Vehicle updated successfully'
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error updating vehicle:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update vehicle' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM energyrite_vehicles WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Vehicle not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching vehicle:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch vehicle' },
      { status: 500 }
    );
  }
}