import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('📊 Excel Report Generation Request:', body);

    // Forward the request to the external API
    const externalApiUrl = `http://${process.env.NEXT_PUBLIC_API_HOST}:${process.env.NEXT_PUBLIC_API_PORT}/api/energy-rite/excel-reports/generate`;

    console.log('🔄 Forwarding to external API:', externalApiUrl);

    const response = await fetch(externalApiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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
    const filename = `fuel-report-${body.period || 'custom'}-${timestamp}.xlsx`;

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
    console.error('❌ Excel report generation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error while generating Excel report'
    }, { status: 500 });
  }
}