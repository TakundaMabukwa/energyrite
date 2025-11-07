import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const costCode = searchParams.get('cost_code');
    const siteId = searchParams.get('site_id');
    const date = searchParams.get('date');
    const snapshotType = searchParams.get('snapshot_type');
    const includeHierarchy = searchParams.get('include_hierarchy') || 'true';
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';

    console.log('📸 Snapshot Report Request:', { costCode, siteId, date, snapshotType, includeHierarchy });

    // Set default date to today if not provided
    const reportDate = date || new Date().toISOString().split('T')[0];

    // Build parameters for external API call
    const params = new URLSearchParams();
    params.append('date', reportDate);
    params.append('include_hierarchy', includeHierarchy);
    params.append('limit', limit);
    params.append('offset', offset);
    
    if (costCode) {
      params.append('cost_code', costCode);
    }
    if (siteId) {
      params.append('site_id', siteId);
    }
    if (snapshotType) {
      params.append('snapshot_type', snapshotType);
    }

    // Forward the request to the external API
    const externalApiUrl = `http://${process.env.NEXT_PUBLIC_API_HOST}:${process.env.NEXT_PUBLIC_API_PORT}/api/energy-rite/reports/snapshots`;
    const apiUrl = `${externalApiUrl}?${params.toString()}`;

    console.log('🔄 Forwarding to external snapshot API:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('❌ External snapshot API error:', response.status, response.statusText);
      return NextResponse.json({
        success: false,
        error: `Failed to fetch snapshot reports: ${response.statusText}`
      }, { status: response.status });
    }

    const data = await response.json();
    
    console.log('✅ Snapshot reports data received successfully');

    // Return the data in the expected format
    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('❌ Snapshot reports error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error while fetching snapshot reports'
    }, { status: 500 });
  }
}