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
    const { email, role, cost_code, company, branch, site_id, energyrite, first_login } = body;

    // Validate required fields
    if (!email || !role || !cost_code || !company) {
      return NextResponse.json(
        { error: 'Missing required fields: email, role, cost_code, company' },
        { status: 400 }
      );
    }

    // Generate random password
    const generatePassword = () => {
      const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
      let password = '';
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };
    const generatedPassword = generatePassword();

    console.log('🚀 Creating user with admin API:', { email, role, cost_code, company, branch, site_id });

    // Step 1: Create user in Supabase Auth using admin API
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: generatedPassword,
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

    // Step 2: Wait for user to be created in users table (optimized retry logic)
    const userId = authUser.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found after creation' },
        { status: 500 }
      );
    }

    let userRecord = null;
    let attempts = 0;
    const maxAttempts = 5;
    const delay = 300; // 300ms

    while (attempts < maxAttempts && !userRecord) {
      if (attempts > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
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
        site_id: site_id || null,
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

    // Send welcome email asynchronously (don't wait for it)
    setImmediate(async () => {
      try {
        const { sendWelcomeEmail } = await import('@/lib/email-service');
        const roleDisplayName = role === 'energyrite_admin' ? 'EnergyRite Administrator' : 'EnergyRite User';
        
        const emailResult = await Promise.race([
          sendWelcomeEmail({
            email: updatedUser.email,
            role: roleDisplayName,
            company: updatedUser.company,
            cost_code: updatedUser.cost_code,
            site_id: updatedUser.site_id,
            password: generatedPassword
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Email timeout after 15 seconds')), 15000)
          )
        ]);
        
        if (emailResult.success) {
          console.log('✅ Welcome email sent successfully to:', updatedUser.email);
        } else {
          console.error('❌ Email service returned error:', emailResult.error);
        }
      } catch (emailError) {
        console.error('❌ Failed to send welcome email (timeout or connection error):', emailError.message);
      }
    });

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
      password: generatedPassword,
      emailSent: 'async' // Indicate email is being sent asynchronously
    });

  } catch (error) {
    console.error('❌ Unexpected error in create-user API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
