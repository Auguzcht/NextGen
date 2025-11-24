import { createClient } from '@supabase/supabase-js';
import { sendBatchEmails, validateEmailConfig } from '../utils/emailProviders.js';

// Use non-VITE prefixed vars in production
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Send Weekly Report API
 * POST: Generate and send weekly attendance reports to all guardians
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

    // Call the database function to prepare weekly report
    const { data: reportData, error: reportError } = await supabase
      .rpc('send_weekly_email_report');

    if (reportError) {
      throw new Error(`Failed to generate report: ${reportError.message}`);
    }

    if (!reportData || reportData.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No report data generated'
      });
    }

    const report = reportData[0];

    // Get recipients from the database
    const { data: recipients, error: recipientsError } = await supabase
      .from('weekly_email_recipients')
      .select('email, guardian_first_name, guardian_last_name, guardian_id');

    if (recipientsError) {
      throw new Error(`Failed to fetch recipients: ${recipientsError.message}`);
    }

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No recipients found with valid email addresses'
      });
    }

    // Format recipients for batch sending
    const formattedRecipients = recipients.map(r => ({
      email: r.email,
      name: `${r.guardian_first_name} ${r.guardian_last_name}`,
      guardianId: r.guardian_id
    }));

    // Get the weekly report template
    const { data: template } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_name', 'Weekly Report')
      .eq('is_active', true)
      .single();

    // Prepare batch email data
    const emailData = {
      fromEmail: report.from_email,
      fromName: report.from_name,
      recipients: formattedRecipients,
      subject: report.subject,
      html: report.email_html,
      text: 'Please view this email in HTML format for the best experience.'
    };

    // Send batch emails
    const results = await sendBatchEmails(
      emailConfig.provider,
      report.api_key,
      emailData,
      emailConfig.batch_size
    );

    // Log successful emails
    if (results.success.length > 0) {
      const successLogs = results.success.map(item => ({
        template_id: template?.template_id || null,
        recipient_email: item.email,
        guardian_id: item.guardianId || null,
        sent_date: new Date().toISOString(),
        status: 'sent',
        notes: `Weekly report batch ${report.batch_id} - Message ID: ${item.messageId || 'N/A'}`
      }));

      await supabase
        .from('email_logs')
        .insert(successLogs);
    }

    // Log failed emails
    if (results.failed.length > 0) {
      const failedLogs = results.failed.map(item => ({
        template_id: template?.template_id || null,
        recipient_email: item.email,
        guardian_id: item.guardianId || null,
        sent_date: new Date().toISOString(),
        status: 'failed',
        notes: `Weekly report batch ${report.batch_id} - Error: ${item.error}`
      }));

      await supabase
        .from('email_logs')
        .insert(failedLogs);
    }

    // Update the weekly report with email sent status
    await supabase
      .from('weekly_reports')
      .update({
        email_sent_date: new Date().toISOString(),
        notes: `Sent to ${results.success.length} of ${results.total} recipients`
      })
      .eq('report_id', report.report_id);

    return res.status(200).json({
      success: true,
      message: 'Weekly report emails sent successfully',
      data: {
        reportId: report.report_id,
        batchId: report.batch_id,
        total: results.total,
        successful: results.success.length,
        failed: results.failed.length,
        successRate: ((results.success.length / results.total) * 100).toFixed(2) + '%',
        totalBatches: report.total_batches,
        failures: results.failed.length > 0 ? results.failed : undefined
      }
    });
  } catch (error) {
    console.error('Send weekly report error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send weekly report'
    });
  }
}
