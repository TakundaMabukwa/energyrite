/**
 * Energy Rite Email Service
 * Uses NotificationAPI to bypass SMTP port blocking
 */
const notificationapi = require('notificationapi-node-server-sdk').default;

export async function sendWelcomeEmail(options: any) {
  const { email, password, role, company, cost_code, site_id } = options;

  try {
    console.log('Sending email via NotificationAPI...');
    
    // Initialize NotificationAPI
    notificationapi.init(
      process.env.NOTIFICATIONAPI_CLIENT_ID,
      process.env.NOTIFICATIONAPI_CLIENT_SECRET
    );

    // HTML email template
    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background-color: #1e3a5f; color: white; padding: 30px 20px; text-align: center;">
          <img src="https://energyrite.co.za/wp-content/uploads/energyrite_logo.svg" alt="EnergyRite Logo" style="max-width: 200px; height: auto; margin-bottom: 20px;" />
          <h1 style="margin: 0; font-size: 28px; font-weight: 600;">Welcome to your Generator Fuel Management APP</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your account has been created</p>
        </div>
        <div style="padding: 30px 20px; background-color: #f8f9fa; color: #333;">
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Hello,</p>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 25px;">Your Generator Fuel Management APP account has been successfully created. Please use the credentials below to access the system. A link to the platform will be provided shortly.</p>
          
          <div style="background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #1e3a5f; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p style="margin: 0 0 12px 0; font-size: 15px;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 0 0 12px 0; font-size: 15px;"><strong>Password:</strong> <code style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${password}</code></p>
            <p style="margin: 0; font-size: 15px;"><strong>Company:</strong> ${company}</p>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #ffc107;">
            <p style="margin: 0; font-size: 14px; line-height: 1.5;"><strong>Security Notice:</strong> Please change your password after your first login for security purposes.</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="font-size: 12px; color: #666; text-align: center; line-height: 1.5; margin: 0;">
            This is an automated message from the EnergyRite system.<br>
            © ${new Date().getFullYear()} EnergyRite - Smart Energy Management
          </p>
        </div>
      </div>
    `;

    // Send via NotificationAPI
    const result = await notificationapi.send({
      type: 'welcome_notification',
      to: {
        id: email,
        email: email
      },
      email: {
        subject: 'Welcome to your Generator Fuel Management APP - Your Account Credentials',
        html: emailHTML
      }
    });

    console.log('✅ Email sent successfully via NotificationAPI');
    return { 
      success: true, 
      messageId: result.data?.id || 'notificationapi',
      provider: 'notificationapi'
    };
    
  } catch (error: any) {
    console.error('❌ NotificationAPI failed:', error.message);
    return { 
      success: false, 
      error: error.message 
    };
  }
}