import { createClient } from '@supabase/supabase-js';
import { sendEmail, validateEmailConfig } from '../utils/emailProviders.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Send Test Email API
 * POST: Send a test email to verify configuration
 */
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { testEmail, config } = req.body;

    if (!testEmail) {
      return res.status(400).json({
        success: false,
        error: 'Test email address is required'
      });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address format'
      });
    }

    // Get email configuration
    let emailConfig = config;
    if (!emailConfig) {
      const { data, error } = await supabase
        .from('email_api_config')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return res.status(400).json({
          success: false,
          error: 'Email configuration not found. Please configure your email settings first.'
        });
      }

      emailConfig = data;
    }

    // Validate configuration
    const validation = validateEmailConfig(emailConfig);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email configuration',
        details: validation.errors
      });
    }

    // Prepare test email
    const emailData = {
      fromEmail: emailConfig.from_email,
      fromName: emailConfig.from_name,
      to: [testEmail],
      subject: 'NextGen Ministry - Test Email',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .success-badge { background: #10b981; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 20px 0; }
            .info-box { background: white; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Test Email Successful!</h1>
            </div>
            <div class="content">
              <div class="success-badge">✓ Configuration Working</div>
              
              <p>Congratulations! Your NextGen Ministry email configuration is working correctly.</p>
              
              <div class="info-box">
                <strong>Configuration Details:</strong><br>
                Provider: ${emailConfig.provider}<br>
                From: ${emailConfig.from_name} &lt;${emailConfig.from_email}&gt;<br>
                Batch Size: ${emailConfig.batch_size} emails per batch
              </div>
              
              <p>You can now use this configuration to:</p>
              <ul>
                <li>Send weekly attendance reports to guardians</li>
                <li>Send custom messages via Email Composer</li>
                <li>Send event reminders and notifications</li>
                <li>Send birthday messages</li>
              </ul>
              
              <p>If you have any questions or need assistance, please contact your system administrator.</p>
            </div>
            <div class="footer">
              <p>This is an automated test email from NextGen Ministry</p>
              <p>Sent at ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `NextGen Ministry - Test Email\n\nCongratulations! Your email configuration is working correctly.\n\nProvider: ${emailConfig.provider}\nFrom: ${emailConfig.from_name} <${emailConfig.from_email}>\n\nYou can now send emails through the NextGen Ministry system.`
    };

    // Send test email
    const result = await sendEmail(emailConfig.provider, emailConfig.api_key, emailData);

    // Log the test email
    await supabase
      .from('email_logs')
      .insert({
        template_id: null,
        recipient_email: testEmail,
        sent_date: new Date().toISOString(),
        status: 'sent',
        notes: 'Test email sent successfully'
      });

    return res.status(200).json({
      success: true,
      message: 'Test email sent successfully',
      data: {
        messageId: result.id || result.messageId,
        recipient: testEmail
      }
    });
  } catch (error) {
    console.error('Send test email error:', error);
    
    // Log failed attempt
    try {
      await supabase
        .from('email_logs')
        .insert({
          template_id: null,
          recipient_email: req.body.testEmail,
          sent_date: new Date().toISOString(),
          status: 'failed',
          notes: `Test email failed: ${error.message}`
        });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send test email'
    });
  }
}
