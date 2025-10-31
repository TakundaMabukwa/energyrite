const nodemailer = require('nodemailer');

class EmailService {
  private transporter: any;

  constructor() {
    // Debug environment variables
    console.log('Email config:', {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      user: process.env.EMAIL_USER,
      password: process.env.EMAIL_PASSWORD,
      hasPassword: !!process.env.EMAIL_PASSWORD
    });
    
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '465'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      debug: true,
      logger: true
    });
  }

  async sendWelcomeEmail(options: { email: string; role: string; company: string; cost_code: string; site_id?: string; password: string }) {
    const { email, role, company, cost_code, site_id, password } = options;
    
    const accessInfo = site_id 
      ? `<strong>Site Access:</strong> ${site_id}` 
      : `<strong>Cost Center:</strong> ${cost_code}`;

    const roleDisplay = role === 'energyrite_admin' ? 'EnergyRite Administrator' : 'EnergyRite User';

    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e3a5f; color: white; padding: 20px; text-align: center;">
          <h1>Welcome to EnergyRite</h1>
          <p>Your account is ready to use</p>
        </div>
        <div style="padding: 20px; background-color: #f8f9fa; color: #333;">
          <p><strong>Hello,</strong></p>
          <p>Your EnergyRite account has been created and is ready to use. Here are your login details:</p>
          
          <div style="background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border: 2px solid #1e3a5f;">
            <h3 style="color: #1e3a5f; margin-top: 0;">Login Credentials</h3>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Password:</strong> <code style="background: #f1f1f1; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${password}</code></p>
            <p><strong>Role:</strong> ${roleDisplay}</p>
            <p><strong>Company:</strong> ${company}</p>
            <p>${accessInfo}</p>
          </div>
          
          <div style="background: #e8f4fd; padding: 15px; border-radius: 5px; border-left: 4px solid #0066cc;">
            <p style="margin: 0;"><strong>Next Steps:</strong></p>
            <p style="margin: 5px 0 0 0;">Use the credentials above to log into the EnergyRite system. We recommend changing your password after your first login.</p>
          </div>
          
          <hr style="border: 1px solid #ddd; margin: 20px 0;">
          <p style="font-size: 12px; color: #666; text-align: center;">
            This is an automated message from the EnergyRite system.<br>
            © ${new Date().getFullYear()} EnergyRite - Smart Energy Management
          </p>
        </div>
      </div>
    `;

    await this.transporter.sendMail({
      from: `"EnergyRite" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'EnergyRite Login Credentials - Account Ready',
      html: emailHTML
    });
  }
}

export const emailService = new EmailService();