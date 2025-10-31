import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    await emailService.sendWelcomeEmail({
      email: 'mabukwa25@gmail.com',
      role: 'EnergyRite Administrator',
      company: 'Test Company',
      cost_code: 'TEST-001',
      password: 'TestPassword123'
    });

    return NextResponse.json({ success: true, message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Failed to send test email:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to send test email' },
      { status: 500 }
    );
  }
}