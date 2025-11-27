import { createClient } from '@supabase/supabase-js';
import { sendBatchEmails, validateEmailConfig } from '../utils/emailProviders.js';
import { createCustomEmailTemplate } from '../../src/utils/emailTemplates.js';

// Use non-VITE prefixed vars in production
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
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
    const { recipients, subject, html, text, templateId, materialIds } = req.body;

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

    // Fetch materials to include as links if provided
    let materials = [];
    if (materialIds && Array.isArray(materialIds) && materialIds.length > 0) {
      const { data: materialsData, error: materialError } = await supabase
        .from('materials')
        .select(`
          material_id, 
          title, 
          file_url, 
          category, 
          description,
          age_categories (category_name)
        `)
        .in('material_id', materialIds)
        .eq('is_active', true);

      if (materialError) {
        console.error('Error fetching materials:', materialError);
      } else if (materialsData && materialsData.length > 0) {
        materials = materialsData;
      }
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

    // Prepare batch email data with standardized template including materials
    const standardizedHtml = createCustomEmailTemplate({
      subject: subject,
      htmlContent: html,
      recipientName: null, // Will be personalized per recipient
      materials: materials // Pass materials directly to the template
    });

    const emailData = {
      fromEmail: emailConfig.from_email,
      fromName: emailConfig.from_name,
      recipients: recipients,
      subject: subject,
      html: standardizedHtml,
      text: text || null
      // Removed attachments - we're embedding links instead
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
        material_ids: materialIds && materialIds.length > 0 ? JSON.stringify(materialIds) : null,
        sent_date: new Date().toISOString(),
        status: 'sent',
        notes: `Message ID: ${item.messageId || 'N/A'}${materials.length > 0 ? ` | Materials: ${materials.length}` : ''}`
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
        material_ids: materialIds && materialIds.length > 0 ? JSON.stringify(materialIds) : null,
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
