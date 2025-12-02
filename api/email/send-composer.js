import { createClient } from '@supabase/supabase-js';
import { sendBatchEmails, validateEmailConfig } from '../utils/emailProviders.js';
import { createCustomEmailTemplate } from '../../src/utils/emailTemplates.js';

// Use non-VITE prefixed vars in production
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Send Composer Emails API
 * POST: Send emails from the EmailComposer component
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
    const {
      subject,
      body_html,
      recipient_type,
      filter_type,
      filter_value,
      selected_recipients,
      material_ids,
      attachment_urls,
      template_id
    } = req.body;

    // Validate required fields
    if (!subject || !body_html) {
      return res.status(400).json({
        success: false,
        error: 'Subject and email body are required'
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

    let recipients = [];

    // Get recipients based on type and filters
    if (recipient_type === 'individual') {
      // Use selected recipients
      recipients = selected_recipients.map(r => ({
        email: r.email,
        name: r.name,
        type: r.type
      }));
    } else {
      // Fetch recipients based on filters
      if (recipient_type === 'guardians' || recipient_type === 'both') {
        let guardianQuery = supabase
          .from('guardians')
          .select(`
            guardian_id,
            first_name,
            last_name,
            email,
            child_guardian (
              children (first_name, last_name, is_active, age_category_id)
            )
          `)
          .not('email', 'is', null);

        // Apply filters for guardians
        if (filter_type === 'active') {
          // Get guardians with active children
          const { data: activeGuardians } = await supabase
            .from('child_guardian')
            .select('guardian_id, children!inner(is_active)')
            .eq('children.is_active', true);
          
          const guardianIds = [...new Set(activeGuardians?.map(g => g.guardian_id) || [])];
          if (guardianIds.length > 0) {
            guardianQuery = guardianQuery.in('guardian_id', guardianIds);
          } else {
            guardianQuery = guardianQuery.eq('guardian_id', -1); // No results
          }
        } else if (filter_type === 'age_group' && filter_value) {
          // Get guardians with children in specific age group
          const { data: guardiansByAge } = await supabase
            .from('child_guardian')
            .select('guardian_id, children!inner(age_category_id)')
            .eq('children.age_category_id', parseInt(filter_value));
          
          const guardianIds = [...new Set(guardiansByAge?.map(g => g.guardian_id) || [])];
          if (guardianIds.length > 0) {
            guardianQuery = guardianQuery.in('guardian_id', guardianIds);
          } else {
            guardianQuery = guardianQuery.eq('guardian_id', -1); // No results
          }
        }

        const { data: guardians, error: guardianError } = await guardianQuery;
        if (guardianError) throw guardianError;

        // Add guardians to recipients
        guardians?.forEach(guardian => {
          recipients.push({
            email: guardian.email,
            name: `${guardian.first_name} ${guardian.last_name}`,
            type: 'guardian'
          });
        });
      }

      if (recipient_type === 'staff' || recipient_type === 'both') {
        let staffQuery = supabase
          .from('staff')
          .select('staff_id, first_name, last_name, email, role')
          .not('email', 'is', null);

        // Apply filters for staff
        if (filter_type === 'active') {
          staffQuery = staffQuery.eq('is_active', true);
        }

        const { data: staff, error: staffError } = await staffQuery;
        if (staffError) throw staffError;

        // Add staff to recipients
        staff?.forEach(member => {
          recipients.push({
            email: member.email,
            name: `${member.first_name} ${member.last_name}`,
            type: 'staff'
          });
        });
      }
    }

    if (recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No recipients found matching the specified criteria'
      });
    }

    // Fetch materials if material_ids are provided
    let materials = [];
    if (material_ids && material_ids.length > 0) {
      const { data: materialsData, error: materialsError } = await supabase
        .from('materials')
        .select(`
          material_id,
          title,
          category,
          file_url,
          age_categories (category_name)
        `)
        .in('material_id', material_ids);

      if (!materialsError && materialsData) {
        materials = materialsData;
      }
    }

    // Generate standardized HTML using the email template with greeting extraction
    const standardizedHtml = createCustomEmailTemplate({
      subject: subject,
      htmlContent: body_html,
      recipientName: null, // Will be personalized per recipient
      materials: materials,
      recipientType: recipient_type || 'guardians' // Pass recipient type for proper greeting selection
    });

    // Prepare batch email data
    const emailData = {
      fromEmail: emailConfig.from_email,
      fromName: emailConfig.from_name,
      recipients: recipients,
      subject: subject,
      html: standardizedHtml, // Now properly processed through createCustomEmailTemplate
      text: null // Could extract text from HTML if needed
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
      const logEntries = results.success.map(result => ({
        template_id: template_id || null,
        recipient_email: result.recipient,
        sent_date: new Date().toISOString(),
        status: 'sent',
        notes: `Sent via EmailComposer - Subject: ${subject}`
      }));

      await supabase
        .from('email_logs')
        .insert(logEntries);
    }

    // Log failed emails
    if (results.failed.length > 0) {
      const failedLogEntries = results.failed.map(failure => ({
        template_id: template_id || null,
        recipient_email: failure.recipient,
        sent_date: new Date().toISOString(),
        status: 'failed',
        notes: `Failed via EmailComposer: ${failure.error} - Subject: ${subject}`
      }));

      await supabase
        .from('email_logs')
        .insert(failedLogEntries);
    }

    return res.status(200).json({
      success: true,
      message: `Email batch completed. ${results.success.length} sent, ${results.failed.length} failed.`,
      data: {
        sent: results.success.length,
        failed: results.failed.length,
        recipients: recipients.length,
        failures: results.failed
      }
    });

  } catch (error) {
    console.error('Send composer emails error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send emails'
    });
  }
}