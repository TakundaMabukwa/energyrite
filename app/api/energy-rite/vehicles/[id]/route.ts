import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const EXTERNAL_API_BASE =
  process.env.ENERGYRITE_SITES_API_URL || 'http://209.38.217.58:8000/api/energyrite-sites';

type RouteContext = { params: Promise<{ id: string }> };

async function patchExternalById(id: string, body: any) {
  const plate = String(body?.plate || body?.branch || '').trim();
  const reg = String(body?.reg || plate).trim();
  const ip_address = body?.ip_address !== undefined ? String(body.ip_address) : '';
  const cost_code = body?.cost_code !== undefined ? String(body.cost_code) : '';

  if (!plate || !reg || !cost_code) {
    return NextResponse.json(
      { success: false, error: 'plate, reg, and cost_code are required' },
      { status: 400 }
    );
  }

  const payload = { plate, reg, ip_address, cost_code };
  const url = `${EXTERNAL_API_BASE}/${encodeURIComponent(id)}`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!response.ok) {
    return NextResponse.json(
      {
        success: false,
        error: (data && (data.error || data.message)) || `External API failed: ${response.status}`,
        external_status: response.status,
      },
      { status: response.status }
    );
  }

  return NextResponse.json({ success: true, data, payload });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    return await patchExternalById(id, body);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update vehicle' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  // Keep PUT as alias so older frontend calls still work.
  return PATCH(request, context);
}

