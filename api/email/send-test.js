import { createClient } from '@supabase/supabase-js';
import { sendEmail, validateEmailConfig } from '../utils/emailProviders.js';
import { createTestEmailTemplate } from '../../src/utils/emailTemplates.js';

// Use non-VITE prefixed vars in production
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
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

    // Prepare test email using standardized template
    const emailData = {
      fromEmail: emailConfig.from_email,
      fromName: emailConfig.from_name,
      to: [testEmail],
      subject: 'NextGen Ministry - Test Email Configuration',
      html: createTestEmailTemplate(),
      text: `NextGen Ministry - Test Email Configuration

Congratulations! Your email configuration is working correctly.

Provider: ${emailConfig.provider}
From: ${emailConfig.from_name} <${emailConfig.from_email}>
Batch Size: ${emailConfig.batch_size} emails per batch

Your email system is now ready to:
• Send Weekly Reports: Automated attendance summaries to guardians
• Send Notifications: Event reminders and important announcements  
• Send Custom Messages: Personalized communications via Email Composer
• Send Staff Credentials: Account setup and password reset emails

This is an automated test email from NextGen Ministry
Sent at ${new Date().toLocaleString()}`
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
