import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    
    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint parameter is required' }, { status: 400 });
    }
    
    // Build the full URL
    const baseUrl = 'http://64.227.138.235:3000';
    const fullUrl = `${baseUrl}${endpoint}`;
    
    // Forward query parameters
    const queryString = searchParams.toString().replace('endpoint=' + encodeURIComponent(endpoint), '');
    const finalUrl = queryString ? `${fullUrl}?${queryString}` : fullUrl;
    
    console.log('🔄 Proxying request to:', finalUrl);
    
    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📡 External API response status:', response.status);
    console.log('📡 External API response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      // Try to get error details from the response
      let errorDetails = '';
      try {
        const errorText = await response.text();
        console.log('❌ External API error response:', errorText);
        errorDetails = errorText;
      } catch (e) {
        console.log('❌ Could not read error response body');
      }
      
      throw new Error(`HTTP error! status: ${response.status}${errorDetails ? ` - ${errorDetails}` : ''}`);
    }
    
    const data = await response.json();
    console.log('✅ External API response data received');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Proxy error:', error);
    
    // Provide more specific error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isDatabaseError = errorMessage.includes('database system is not yet accepting connections');
    
    return NextResponse.json(
      { 
        error: isDatabaseError 
          ? 'External database is temporarily unavailable. Using fallback data.' 
          : 'Failed to fetch data from Energy Rite API',
        details: errorMessage,
        fallback: true
      },
      { status: 500 }
    );
  }
}
