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
    const { email, role, cost_code, company, branch, energyrite, first_login } = body;

    // Validate required fields
    if (!email || !role || !cost_code || !company) {
      return NextResponse.json(
        { error: 'Missing required fields: email, role, cost_code, company' },
        { status: 400 }
      );
    }

    console.log('🚀 Creating user with admin API:', { email, role, cost_code, company, branch });

    // Step 1: Create user in Supabase Auth using admin API
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: "12345678", // Set default password
      email_confirm: true,
      user_metadata: {
        role: role,
        cost_code: cost_code,
        company: company,
        branch: branch,
        energyrite: energyrite || true,
        first_login: first_login || true
      }
    });

    if (authError) {
      console.error('❌ Error creating auth user:', authError);
      return NextResponse.json(
        { error: `Failed to create auth user: ${authError.message}` },
        { status: 400 }
      );
    }

    console.log('✅ Auth user created:', authUser.user?.id);

    // Step 2: Wait for user to be created in users table (with retry logic)
    const userId = authUser.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found after creation' },
        { status: 500 }
      );
    }

    let userRecord = null;
    let attempts = 0;
    const maxAttempts = 10;
    const delay = 1000; // 1 second

    while (attempts < maxAttempts && !userRecord) {
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError && userError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ Error checking user table:', userError);
        break;
      }

      if (userData) {
        userRecord = userData;
        console.log('✅ User found in users table:', userData.id);
        break;
      }

      attempts++;
      console.log(`⏳ Waiting for user to appear in users table... attempt ${attempts}/${maxAttempts}`);
    }

    if (!userRecord) {
      return NextResponse.json(
        { error: 'User was not created in users table within expected time' },
        { status: 500 }
      );
    }

    // Step 3: Update the user record with additional information
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        role: role,
        cost_code: cost_code,
        company: company,
        energyrite: energyrite || true,
        first_login: first_login || true,
        tech_admin: false,
        permissions: null
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating user record:', updateError);
      return NextResponse.json(
        { error: `Failed to update user record: ${updateError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ User record updated successfully:', updatedUser.id);

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        cost_code: updatedUser.cost_code,
        company: updatedUser.company,
        energyrite: updatedUser.energyrite,
        first_login: updatedUser.first_login
      },
      password: "12345678" // Include the default password in response
    });

  } catch (error) {
    console.error('❌ Unexpected error in create-user API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
