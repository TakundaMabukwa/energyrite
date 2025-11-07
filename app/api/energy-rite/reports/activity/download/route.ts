import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');
    const costCode = searchParams.get('cost_code');
    const date = searchParams.get('date');

    console.log('📊 Activity Report Download Request:', { format, costCode, date });

    // Validate required parameters
    if (!format || !costCode || !date) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: format, cost_code, and date are required'
      }, { status: 400 });
    }

    if (format !== 'excel') {
      return NextResponse.json({
        success: false,
        error: 'Only excel format is currently supported'
      }, { status: 400 });
    }

    // Forward the request to the external API
    const externalApiUrl = `http://${process.env.NEXT_PUBLIC_API_HOST}:${process.env.NEXT_PUBLIC_API_PORT}/api/energy-rite/activity-excel-reports/generate`;
    const params = new URLSearchParams({
      cost_code: costCode,
      date: date
    });

    console.log('🔄 Forwarding to external API:', `${externalApiUrl}?${params.toString()}`);

    const response = await fetch(`${externalApiUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });

    if (!response.ok) {
      console.error('❌ External API error:', response.status, response.statusText);
      return NextResponse.json({
        success: false,
        error: `Failed to generate Excel report: ${response.statusText}`
      }, { status: response.status });
    }

    // Get the Excel file content
    const excelBuffer = await response.arrayBuffer();
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `activity-report-${costCode}-${date}-${timestamp}.xlsx`;

    console.log('✅ Excel report generated successfully:', filename);

    // Return the Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('❌ Activity report download error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error while generating Excel report'
    }, { status: 500 });
  }
}