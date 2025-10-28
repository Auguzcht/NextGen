import { createClient } from '@supabase/supabase-js';
import { sendBatchEmails, validateEmailConfig } from '../utils/emailProviders.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Send Batch Emails API
 * POST: Send emails to multiple recipients in batches
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
    const { recipients, subject, html, text, templateId } = req.body;

    // Validate request
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Recipients array is required and must not be empty'
      });
    }

    if (!subject || !html) {
      return res.status(400).json({
        success: false,
        error: 'Subject and HTML content are required'
      });
    }

    // Get email configuration
    const { data: emailConfig, error: configError } = await supabase
      .from('email_api_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (configError || !emailConfig) {
      return res.status(400).json({
        success: false,
        error: 'Email configuration not found. Please configure your email settings first.'
      });
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

    // Prepare batch email data
    const emailData = {
      fromEmail: emailConfig.from_email,
      fromName: emailConfig.from_name,
      recipients: recipients,
      subject: subject,
      html: html,
      text: text || null
    };

    // Send batch emails
    const results = await sendBatchEmails(
      emailConfig.provider,
      emailConfig.api_key,
      emailData,
      emailConfig.batch_size
    );

    // Log successful emails
    if (results.success.length > 0) {
      const successLogs = results.success.map(item => ({
        template_id: templateId || null,
        recipient_email: item.email,
        guardian_id: item.guardianId || null,
        sent_date: new Date().toISOString(),
        status: 'sent',
        notes: `Message ID: ${item.messageId || 'N/A'}`
      }));

      await supabase
        .from('email_logs')
        .insert(successLogs);
    }

    // Log failed emails
    if (results.failed.length > 0) {
      const failedLogs = results.failed.map(item => ({
        template_id: templateId || null,
        recipient_email: item.email,
        guardian_id: item.guardianId || null,
        sent_date: new Date().toISOString(),
        status: 'failed',
        notes: `Error: ${item.error}`
      }));

      await supabase
        .from('email_logs')
        .insert(failedLogs);
    }

    return res.status(200).json({
      success: true,
      message: 'Batch email processing completed',
      data: {
        total: results.total,
        successful: results.success.length,
        failed: results.failed.length,
        successRate: ((results.success.length / results.total) * 100).toFixed(2) + '%',
        failures: results.failed.length > 0 ? results.failed : undefined
      }
    });
  } catch (error) {
    console.error('Send batch email error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send batch emails'
    });
  }
}
