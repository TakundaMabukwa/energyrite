import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    const result = await emailService.sendWelcomeEmail({
      email: 'test@example.com',
      role: 'Test User',
      company: 'Test Company',
      cost_code: 'TEST-001',
      password: 'TestPassword123'
    });

    return NextResponse.json({ 
      success: result.success, 
      message: result.success ? 'Test email sent successfully' : result.error 
    });
  } catch (error) {
    console.error('Failed to send test email:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to send test email' },
      { status: 500 }
    );
  }
}