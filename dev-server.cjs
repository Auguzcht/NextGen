/**
 * Development API Server
 * This server handles API routes during local development
 * In production, Vercel serverless functions handle these routes
 */

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Simple inline handlers for development
// In production, Vercel uses the actual serverless functions

// Email configuration handler
app.all('/api/email/config', async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('email_api_config')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return res.status(200).json({
        success: true,
        data: data || null
      });
    }

    if (req.method === 'POST') {
      const { provider, api_key, from_email, from_name, batch_size, is_active, updated_by } = req.body;

      if (!provider || !api_key || !from_email || !from_name) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      const { data: existingConfig } = await supabase
        .from('email_api_config')
        .select('config_id')
        .single();

      let result;
      if (existingConfig) {
        result = await supabase
          .from('email_api_config')
          .update({
            provider,
            api_key,
            from_email,
            from_name,
            batch_size: batch_size || 100,
            is_active: is_active !== undefined ? is_active : true,
            last_updated: new Date().toISOString(),
            updated_by
          })
          .eq('config_id', existingConfig.config_id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('email_api_config')
          .insert([{
            provider,
            api_key,
            from_email,
            from_name,
            batch_size: batch_size || 100,
            is_active: is_active !== undefined ? is_active : true,
            updated_by
          }])
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      return res.status(200).json({
        success: true,
        data: result.data
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  } catch (error) {
    console.error('Email config API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Send test email handler
app.post('/api/email/send-test', async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  try {
    const { testEmail, config } = req.body;

    if (!testEmail) {
      return res.status(400).json({
        success: false,
        error: 'Test email address is required'
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address format'
      });
    }

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

    // Send test email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${emailConfig.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${emailConfig.from_name} <${emailConfig.from_email}>`,
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
                <p><strong>Provider:</strong> ${emailConfig.provider}</p>
                <p><strong>From:</strong> ${emailConfig.from_name} &lt;${emailConfig.from_email}&gt;</p>
              </div>
            </div>
          </body>
          </html>
        `
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Resend API error: ${error.message || response.statusText}`);
    }

    const result = await response.json();

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
        messageId: result.id,
        recipient: testEmail
      }
    });
  } catch (error) {
    console.error('Send test email error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send test email'
    });
  }
});

// Send staff credentials handler
app.post('/api/email/send-credentials', async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { staffMembers, eventType = 'new_account' } = req.body;

    if (!staffMembers || !Array.isArray(staffMembers) || staffMembers.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'No staff members provided' 
      });
    }

    // Get email configuration from database
    const { data: emailConfig, error: configError } = await supabase
      .from('email_api_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (configError || !emailConfig) {
      console.error('Error fetching email config:', configError);
      return res.status(500).json({ 
        success: false,
        error: 'Email configuration not found. Please configure your email settings first.' 
      });
    }

    // Event type configurations
    const eventConfigs = {
      new_account: {
        subject: 'Welcome to NextGen Ministry - Set Up Your Account',
        title: 'Account Access Information',
        greeting: 'Your account for the NextGen Ministry management system is ready!',
        buttonText: 'Set My Password',
        note: 'Set up your password to get started with the system.'
      },
      password_reset: {
        subject: 'NextGen Ministry - Password Reset Request',
        title: 'Password Reset',
        greeting: 'We received a request to reset your password.',
        buttonText: 'Reset Password',
        note: 'If you didn\'t request this, please ignore this email.'
      },
      account_reactivation: {
        subject: 'NextGen Ministry - Your Account Has Been Reactivated',
        title: 'Account Reactivated',
        greeting: 'Good news! Your NextGen Ministry account has been reactivated.',
        buttonText: 'Access Your Account',
        note: 'Set up a new password to regain access to the system.'
      },
      access_reminder: {
        subject: 'NextGen Ministry - Your Login Credentials',
        title: 'Login Credentials Reminder',
        greeting: 'Here are your login credentials for the NextGen Ministry system.',
        buttonText: 'Set/Reset Password',
        note: 'Click below to set a new password or reset your existing one.'
      }
    };

    const config = eventConfigs[eventType] || eventConfigs.new_account;

    const results = {
      success: [],
      failed: [],
      total: staffMembers.length
    };

    // Initialize Supabase Admin client for password reset links
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Send email to each staff member using Supabase templates
    for (const staff of staffMembers) {
      try {
        // Determine redirect URL and method based on event type
        if (eventType === 'password_reset' || eventType === 'access_reminder') {
          // Use Supabase's resetPasswordForEmail (sends "Reset Password" template)
          const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
            staff.email,
            {
              redirectTo: 'http://localhost:3002/nextgen/reset-password'
            }
          );

          if (resetError) {
            console.error(`Failed to send reset email for ${staff.email}:`, resetError);
            results.failed.push({
              email: staff.email,
              name: `${staff.first_name} ${staff.last_name}`,
              error: resetError.message
            });
            continue;
          }

          results.success.push({
            email: staff.email,
            name: `${staff.first_name} ${staff.last_name}`,
            type: 'password_reset'
          });
        } else {
          // Use Supabase's inviteUserByEmail for new accounts/reactivation (sends "Magic Link" template)
          // This uses the Magic Link template and redirects to dashboard
          const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
            staff.email,
            {
              redirectTo: 'http://localhost:3002/nextgen/dashboard',
              data: {
                first_name: staff.first_name,
                last_name: staff.last_name,
                role: staff.role
              }
            }
          );

          if (inviteError) {
            console.error(`Failed to send invite for ${staff.email}:`, inviteError);
            results.failed.push({
              email: staff.email,
              name: `${staff.first_name} ${staff.last_name}`,
              error: inviteError.message
            });
            continue;
          }

          results.success.push({
            email: staff.email,
            name: `${staff.first_name} ${staff.last_name}`,
            type: 'magic_link'
          });
        }
      } catch (emailError) {
        console.error(`Error sending to ${staff.email}:`, emailError);
        results.failed.push({
          email: staff.email,
          name: `${staff.first_name} ${staff.last_name}`,
          error: emailError.message
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Sent ${results.success.length} out of ${results.total} emails`,
      successCount: results.success.length,
      failureCount: results.failed.length,
      results: results.success,
      errors: results.failed.map(f => `${f.name} (${f.email}): ${f.error}`)
    });
  } catch (error) {
    console.error('Error in send-credentials endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Send batch emails handler
app.post('/api/email/send-batch', async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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
        console.log(`📎 Found ${materials.length} materials for email:`, materials.map(m => m.title).join(', '));
      }
    }

    // Get email configuration from database
    const { data: emailConfig, error: configError } = await supabase
      .from('email_api_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (configError || !emailConfig) {
      console.error('Error fetching email config:', configError);
      return res.status(500).json({
        success: false,
        error: 'Email configuration not found. Please configure your email settings first.'
      });
    }

    // Simple validation for email config
    if (!emailConfig.api_key || !emailConfig.from_email) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email configuration. Missing API key or from email.'
      });
    }

    console.log(`Sending batch emails to ${recipients.length} recipients...`);
    console.log(`Subject: ${subject}`);
    if (materials.length > 0) {
      console.log(`📎 Including ${materials.length} material links:`, materials.map(m => m.title).join(', '));
    }

    // Prepare standardized HTML with materials using the email template
    const { createCustomEmailTemplate } = await import('./src/utils/emailTemplates.js');
    const standardizedHtml = createCustomEmailTemplate({
      subject: subject,
      htmlContent: html,
      recipientName: null, // Will be personalized per recipient
      materials: materials // Pass materials directly to the template
    });

    // Import email providers for real sending
    const { sendBatchEmails } = await import('./api/utils/emailProviders.js');

    // Prepare batch email data for real sending
    const emailBatchData = {
      fromEmail: emailConfig.from_email,
      fromName: emailConfig.from_name,
      recipients: recipients,
      subject: subject,
      html: standardizedHtml,
      text: text || null
      // Materials are now embedded in the standardizedHtml template
    };

    // Send real emails using the same function as production
    const results = await sendBatchEmails(
      emailConfig.provider,
      emailConfig.api_key,
      emailBatchData,
      emailConfig.batch_size
    );

    // Log successful emails
    if (results.success.length > 0) {
      const logEntries = results.success.map(item => ({
        template_id: templateId || null,
        recipient_email: item.email,
        guardian_id: item.guardianId || null,
        material_ids: materialIds && materialIds.length > 0 ? JSON.stringify(materialIds) : null,
        sent_date: new Date().toISOString(),
        status: 'sent',
        notes: `DEV MODE - Message ID: ${item.messageId || 'N/A'}${materials.length > 0 ? ` | Materials: ${materials.length}` : ''}`
      }));

      const { error: logError } = await supabase
        .from('email_logs')
        .insert(logEntries);

      if (logError) {
        console.error('Error logging successful emails:', logError);
      }
    }

    // Log failed emails
    if (results.failed.length > 0) {
      const failedLogEntries = results.failed.map(item => ({
        template_id: templateId || null,
        recipient_email: item.email,
        guardian_id: item.guardianId || null,
        material_ids: materialIds && materialIds.length > 0 ? JSON.stringify(materialIds) : null,
        sent_date: new Date().toISOString(),
        status: 'failed',
        notes: `DEV MODE - Error: ${item.error}`
      }));

      const { error: logError } = await supabase
        .from('email_logs')
        .insert(failedLogEntries);

      if (logError) {
        console.error('Error logging failed emails:', logError);
      }
    }

    console.log(`✅ Successfully sent ${results.success.length} emails, ${results.failed.length} failed (development mode with real sending)`);

    return res.status(200).json({
      success: true,
      message: 'Batch email processing completed (development mode)',
      data: {
        total: results.total,
        successful: results.success.length,
        failed: results.failed.length,
        successRate: '100.0%',
        failures: undefined
      }
    });
  } catch (error) {
    console.error('Send batch email error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send batch emails'
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Development API server is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Development API Server running on http://localhost:${PORT}`);
  console.log(`📧 Email API endpoints available at http://localhost:${PORT}/api/email/*`);
  console.log(`   - POST /api/email/send-test`);
  console.log(`   - POST /api/email/send-batch`);
  console.log(`   - POST /api/email/send-credentials`);
  console.log(`   - GET/POST /api/email/config\n`);
});
