import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    const { email, role, company, accessLevel, site_id, password } = await request.json();

    if (!email || !role || !company || !accessLevel || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await emailService.sendWelcomeEmail({
      email,
      role,
      company,
      cost_code: accessLevel,
      site_id,
      password
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send welcome email' },
      { status: 500 }
    );
  }
}