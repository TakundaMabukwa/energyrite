/**
 * Energy Rite Email Service
 * Handles sending report emails and user credentials to configured recipients
 */
import nodemailer from 'nodemailer';

class EnergyRiteEmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.setupTransporter();
  }

  /**
   * Setup email transporter
   */
  setupTransporter() {
    // Create transporter using environment variables
    this.transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  /**
   * Send welcome email with user credentials
   */
  async sendWelcomeEmail(options: any) {
    const { email, password, role, company, cost_code, site_id } = options;

    try {
      // HTML email template for user credentials
      const emailHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1e3a5f; color: white; padding: 20px; text-align: center;">
            <h1>Welcome to EnergyRite</h1>
            <p>Your account has been created</p>
          </div>
          <div style="padding: 20px; background-color: #f8f9fa; color: #333;">
            <p><strong>Hello,</strong></p>
            <p>Your EnergyRite account has been successfully created. Please use the credentials below to access the system:</p>
            
            <div style="background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #1e3a5f;">
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Password:</strong> ${password}</p>
              <p><strong>Role:</strong> ${role}</p>
              <p><strong>Company:</strong> ${company}</p>
              ${cost_code ? `<p><strong>Cost Code:</strong> ${cost_code}</p>` : ''}
              ${site_id ? `<p><strong>Site:</strong> ${site_id}</p>` : ''}
            </div>
            
            <div style="background: #fff3cd; padding: 10px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #ffc107;">
              <p style="margin: 0; font-size: 14px;"><strong>Security Notice:</strong> Please change your password after your first login for security purposes.</p>
            </div>
            
            <hr style="border: 1px solid #ddd; margin: 20px 0;">
            <p style="font-size: 12px; color: #666; text-align: center;">
              This is an automated message from the EnergyRite system.<br>
              © ${new Date().getFullYear()} EnergyRite - Smart Energy Management
            </p>
          </div>
        </div>
      `;

      // Configure email
      const mailOptions = {
        from: `"Energy Rite System" <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: `Welcome to EnergyRite - Your Account Credentials`,
        html: emailHTML
      };

      // Send email
      const result = await this.transporter.sendMail(mailOptions);
      
      return { 
        success: true, 
        messageId: result.messageId 
      };
      
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
}

export const emailService = new EnergyRiteEmailService();