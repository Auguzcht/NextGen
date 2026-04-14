import { createClient } from '@supabase/supabase-js';
import { sendBatchEmails, validateEmailConfig } from '../../server/utils/emailProviders.js';
import { createCustomEmailTemplate } from '../../src/utils/emailTemplates.js';
import { createEmailLogEntry } from '../../server/utils/emailLogHelpers.js';

// Use non-VITE prefixed vars in production
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY
);

function getEnvEmailConfig() {
  const apiKey =
    process.env.RESEND_API_KEY ||
    process.env.EMAIL_API_KEY ||
    process.env.VITE_RESEND_API_KEY ||
    process.env.VITE_EMAIL_API_KEY;

  const fromEmail =
    process.env.EMAIL_FROM ||
    process.env.FROM_EMAIL ||
    process.env.VITE_EMAIL_FROM ||
    process.env.VITE_FROM_EMAIL;

  const fromName =
    process.env.EMAIL_FROM_NAME ||
    process.env.FROM_NAME ||
    process.env.VITE_EMAIL_FROM_NAME ||
    process.env.VITE_FROM_NAME ||
    'NXTGen Ministry';

  const provider =
    process.env.EMAIL_PROVIDER ||
    process.env.VITE_EMAIL_PROVIDER ||
    'resend';

  const batchSize = Number.parseInt(
    process.env.EMAIL_BATCH_SIZE || process.env.VITE_EMAIL_BATCH_SIZE || '100',
    10
  );

  if (!apiKey || !fromEmail) {
    return null;
  }

  return {
    provider,
    api_key: apiKey,
    from_email: fromEmail,
    from_name: fromName,
    batch_size: Number.isNaN(batchSize) ? 100 : batchSize,
    is_active: true,
  };
}

async function loadActiveEmailConfig() {
  const { data, error } = await supabase
    .from('email_api_config')
    .select('*')
    .eq('is_active', true)
    .maybeSingle();

  if (data) {
    return { emailConfig: data, source: 'database' };
  }

  const envConfig = getEnvEmailConfig();
  if (envConfig) {
    return { emailConfig: envConfig, source: 'environment' };
  }

  return { emailConfig: null, source: 'none', error };
}

const BLOCKED_RECIPIENT_EMAILS = new Set(['admin@example.com']);

function isBlockedRecipient(email) {
  if (!email) return false;
  return BLOCKED_RECIPIENT_EMAILS.has(String(email).trim().toLowerCase());
}

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
    const { recipients, subject, html, text, templateId, materialIds, recipientType } = req.body;
    const sanitizedRecipients = (recipients || []).filter((recipient) => !isBlockedRecipient(recipient?.email));

    // Validate request
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Recipients array is required and must not be empty'
      });
    }

    if (sanitizedRecipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid recipients available after exclusions'
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

    // Load active configuration from database, with env fallback
    const { emailConfig, source, error: configError } = await loadActiveEmailConfig();

    if (!emailConfig) {
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

    // Use the HTML as-is since it's now always a complete template from client
    let standardizedHtml = html;
    console.log(`📧 Email config source: ${source}`);
    if (sanitizedRecipients.length !== recipients.length) {
      console.log(`📧 Skipped ${recipients.length - sanitizedRecipients.length} blocked recipient(s)`);
    }
    console.log(`📧 Production API - Smart sending: ${sanitizedRecipients.length} recipients via ${emailConfig.provider} (${sanitizedRecipients.length >= 3 ? 'Batch API' : 'Individual API'})`);
    console.log('📧 Using pre-processed template from client for recipientType:', recipientType || 'guardians');
    console.log('📎 Materials handled by client-side template processing');
    console.log(`📧 Batch size: ${emailConfig.batch_size}`);

    const emailData = {
      fromEmail: emailConfig.from_email,
      fromName: emailConfig.from_name,
      recipients: sanitizedRecipients,
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
        ...createEmailLogEntry({
          templateId: templateId || null,
          recipientEmail: item.email,
          guardianId: item.guardianId || null,
          subject,
          status: 'sent',
          messageId: item.messageId || item.id || null,
          materialIds,
          notes: `Message ID: ${item.messageId || item.id || 'N/A'}${materials.length > 0 ? ` | Materials: ${materials.length}` : ''}`,
        }),
      }));

      await supabase
        .from('email_logs')
        .insert(successLogs);
    }

    // Log failed emails
    if (results.failed.length > 0) {
      const failedLogs = results.failed.map(item => ({
        ...createEmailLogEntry({
          templateId: templateId || null,
          recipientEmail: item.email,
          guardianId: item.guardianId || null,
          subject,
          status: 'failed',
          errorMessage: item.error || null,
          materialIds,
          notes: `Error: ${item.error}`,
        }),
      }));

      await supabase
        .from('email_logs')
        .insert(failedLogs);
    }

    // Log skipped emails (invalid/placeholder addresses)
    if (results.skipped && results.skipped.length > 0) {
      const skippedLogs = results.skipped.map(item => ({
        ...createEmailLogEntry({
          templateId: templateId || null,
          recipientEmail: item.email,
          guardianId: item.guardianId || null,
          subject,
          status: 'failed',
          errorMessage: item.reason || 'Skipped recipient',
          materialIds,
          notes: `Skipped: ${item.reason}`,
        }),
      }));

      await supabase
        .from('email_logs')
        .insert(skippedLogs);
      
      console.log(`⚠️ ${results.skipped.length} emails skipped due to invalid addresses`);
    }

    return res.status(200).json({
      success: true,
      message: 'Batch email processing completed',
      data: {
        total: results.total,
        successful: results.success.length,
        failed: results.failed.length,
        skipped: results.skipped?.length || 0,
        successRate: ((results.success.length / results.total) * 100).toFixed(2) + '%',
        failures: results.failed.length > 0 ? results.failed : undefined,
        skippedEmails: results.skipped && results.skipped.length > 0 ? results.skipped : undefined
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
