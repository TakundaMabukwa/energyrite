/**
 * Energy Rite Email Service
 * Handles sending report emails and user credentials to configured recipients
 */
const nodemailer = require('nodemailer');
const { createClient } = require('./supabase/server');

class EnergyRiteEmailService {
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
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // Test connection
    this.transporter.verify()
      .then(() => console.log('✅ SMTP connection verified'))
      .catch(error => console.error('❌ SMTP verification failed:', error.message));
  }

  /**
   * Send welcome email with user credentials
   */
  async sendUserCredentials(options) {
    const { email, password, name, costCode, isAdmin } = options;

    try {
      const userType = isAdmin ? 'Administrator' : 'User';
      
      // HTML email template for user credentials
      const emailHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1e3a5f; color: white; padding: 20px; text-align: center;">
            <h1>Welcome to EnergyRite</h1>
            <p>Your account has been created</p>
          </div>
          <div style="padding: 20px; background-color: #f8f9fa; color: #333;">
            <p><strong>Hello ${name || 'User'},</strong></p>
            <p>Your EnergyRite account has been successfully created. Please use the credentials below to access the system:</p>
            
            <div style="background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #1e3a5f;">
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Password:</strong> ${password}</p>
              <p><strong>Account Type:</strong> ${userType}</p>
              ${costCode ? `<p><strong>Cost Code:</strong> ${costCode}</p>` : ''}
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
      
    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Send email with report attachment
   */
  async sendReportEmail(options) {
    const { reportType, period, fileName, downloadUrl, costCode, stats } = options;

    try {
      // Get email recipients
      const recipients = await this.getEmailRecipients(costCode);
      const emails = recipients.map(r => r.email);
      
      // Format stats
      const formattedStats = {
        sites: stats.total_sites || 0,
        sessions: stats.total_sessions || 0,
        operatingHours: stats.total_operating_hours || '0'
      };

      const reportTypeName = reportType.charAt(0).toUpperCase() + reportType.slice(1);
      
      // HTML email template
      const emailHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1e3a5f; color: white; padding: 20px; text-align: center;">
            <h1>EnergyRite ${reportTypeName} Report</h1>
            <p>${period}</p>
          </div>
          <div style="padding: 20px; background-color: #f8f9fa; color: #333;">
            <p><strong>Hello,</strong></p>
            <p>Your EnergyRite ${reportTypeName} report for ${period} is ready for download.</p>
            
            <div style="background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #1e3a5f;">
              <p><strong>Sites:</strong> ${formattedStats.sites} | <strong>Sessions:</strong> ${formattedStats.sessions} | <strong>Hours:</strong> ${formattedStats.operatingHours}</p>
              ${costCode ? `<p><strong>Cost Code:</strong> ${costCode}</p>` : ''}
              <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="${downloadUrl}" style="display: inline-block; background-color: #1e3a5f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;" download="${fileName}">
                Download Report
              </a>
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
        from: `"Energy Rite Reports" <${process.env.EMAIL_FROM}>`,
        to: emails.join(', '),
        subject: `Energy Rite ${reportTypeName} Report - ${period} ${costCode ? `(${costCode})` : ''}`,
        html: emailHTML
      };

      // Send email
      const result = await this.transporter.sendMail(mailOptions);
      
      return { 
        success: true, 
        recipients: emails.length,
        messageId: result.messageId 
      };
      
    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
}

module.exports = new EnergyRiteEmailService();