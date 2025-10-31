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

    // Send via NotificationAPI
    const result = await notificationapi.send({
      type: 'welcome_notification',
      to: {
        id: email,
        email: email
      },
      email: {
        subject: 'Welcome to EnergyRite - Your Account Credentials',
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