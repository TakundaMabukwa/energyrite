import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log('🔄 Updating first_login for user:', userId);

    // Update first_login to false using service role
    const { data, error: updateError } = await supabaseAdmin
      .from('users')
      .update({ first_login: false })
      .eq('id', userId)
      .select();

    if (updateError) {
      console.error('❌ Error updating first_login:', updateError);
      return NextResponse.json(
        { error: 'Failed to update first_login status' },
        { status: 500 }
      );
    }

    console.log('✅ Successfully updated first_login:', data);

    // Add a small delay to ensure the database update is committed
    await new Promise(resolve => setTimeout(resolve, 200));

    return NextResponse.json({ 
      success: true, 
      data 
    });

  } catch (error) {
    console.error('❌ API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
