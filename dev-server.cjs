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

// Special handling for webhook - need raw body for signature verification
app.use('/api/calcom/webhook', express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

// Regular JSON parsing for other routes
app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Cal.com Configuration
const CALCOM_CONFIG = {
  apiKey: process.env.VITE_CALCOM_API_KEY,
  webhookSecret: process.env.VITE_CALCOM_WEBHOOK_SECRET,
  apiBase: process.env.VITE_CALCOM_API_BASE || 'https://api.cal.com/v2',
  apiVersion: '2024-08-13'
};

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

// Send child QR code email handler
app.post('/api/email/send-child-qr', async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { childData } = req.body;

    if (!childData || !childData.guardianEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: childData with guardianEmail' 
      });
    }

    const { firstName, lastName, formalId, guardianEmail, guardianName } = childData;

    console.log(`📧 Sending child QR code email for ${firstName} ${lastName} (${formalId}) to ${guardianEmail}`);

    // Generate QR code as data URL (for both embedding and attachment)
    const QRCode = require('qrcode');
    const { createCanvas, loadImage } = require('canvas');
    const path = require('path');
    
    let qrCodeDataUrl = null;
    let qrCodeBuffer = null;
    
    try {
      // Create canvas for QR with logo
      const qrSize = 400;
      const canvas = createCanvas(qrSize, qrSize);
      const ctx = canvas.getContext('2d');

      // Generate QR code on canvas
      await QRCode.toCanvas(canvas, formalId, {
        width: qrSize,
        margin: 2,
        color: {
          dark: '#30cee4',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      });

      // Try to add logo
      try {
        const logoPath = path.join(__dirname, 'public', 'NextGen-Logo.png');
        const logo = await loadImage(logoPath);
        const logoSize = 88;
        const logoX = (qrSize - logoSize) / 2;
        const logoY = (qrSize - logoSize) / 2;
        
        // Draw white background for logo
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(qrSize / 2, qrSize / 2, logoSize / 2 + 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw logo
        ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
      } catch (logoError) {
        console.warn('Could not load logo for dev QR:', logoError.message);
      }

      // Convert to data URL and buffer
      qrCodeDataUrl = canvas.toDataURL('image/png');
      qrCodeBuffer = canvas.toBuffer('image/png');
    } catch (qrError) {
      console.error('Error generating QR code:', qrError);
      // Fallback to simple QR without logo
      qrCodeDataUrl = await QRCode.toDataURL(formalId, {
        width: 300,
        margin: 2,
        color: { dark: '#30cee4', light: '#ffffff' },
        errorCorrectionLevel: 'H'
      });
    }

    // Get email configuration from database
    const { data: config, error: configError } = await supabase
      .from('email_api_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      console.error('Email configuration not found:', configError);
      return res.status(500).json({ 
        success: false, 
        error: 'Email service not configured' 
      });
    }

    // Import email template function
    const { createChildQREmailTemplate } = await import('./api/utils/emailProviders.js').then(module => {
      // If the template is not in emailProviders, try the templates file
      return import('./src/utils/emailTemplates.js');
    }).catch(() => {
      return import('./src/utils/emailTemplates.js');
    });

    // Create email template (still uses data URL for display in email body)
    const htmlContent = createChildQREmailTemplate({
      childFirstName: firstName,
      childLastName: lastName,
      childFormalId: formalId,
      guardianName: guardianName,
      qrCodeImageUrl: qrCodeDataUrl // Using data URL for dev simplicity
    });

    // Prepare email data - use Resend directly for dev server
    const emailData = {
      from: `${config.from_name} <${config.from_email}>`,
      to: [guardianEmail],
      subject: `${firstName}'s Check-In QR Code - NextGen Ministry`,
      html: htmlContent,
      text: `Hello${guardianName ? ` ${guardianName}` : ''},\n\nThank you for registering ${firstName} ${lastName} with NextGen Ministry!\n\nChild ID: ${formalId}\n\nPlease download the attached QR code image to use for quick check-in at our services.\n\nBlessings,\nNextGen Ministry Davao Team`
    };

    // Add attachment if QR buffer was generated successfully
    if (qrCodeBuffer) {
      emailData.attachments = [
        {
          filename: `${firstName}_${lastName}_QR_${formalId}.png`,
          content: qrCodeBuffer.toString('base64'),
          type: 'image/png',
          disposition: 'attachment'
        }
      ];
      console.log(`📎 DEV MODE - Including QR code attachment: ${firstName}_${lastName}_QR_${formalId}.png`);
    } else {
      console.warn('⚠️ DEV MODE - No attachment added, QR buffer generation failed');
    }

    // Send email via Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Resend API error:', errorData);
      throw new Error(`Resend API error: ${errorData.message || response.statusText}`);
    }

    const result = await response.json();
    console.log(`✅ Child QR code email sent successfully to ${guardianEmail}`);

    // Log the email in database
    try {
      await supabase
        .from('email_logs')
        .insert({
          recipient_email: guardianEmail,
          subject: emailData.subject,
          status: 'sent',
          sent_date: new Date().toISOString(),
          notes: `DEV MODE - Child QR Code | Message ID: ${result.id || 'N/A'}`
        });
    } catch (logError) {
      console.warn('Failed to log email:', logError);
      // Don't fail the request if logging fails
    }

    return res.status(200).json({
      success: true,
      message: 'QR code email sent successfully',
      data: {
        recipient: guardianEmail,
        childName: `${firstName} ${lastName}`,
        formalId: formalId,
        messageId: result.id || null
      }
    });

  } catch (error) {
    console.error('Error sending child QR email:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email'
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
    const { recipients, subject, html, text, templateId, materialIds, recipientType } = req.body;

    console.log('📧 Send batch request received:', {
      recipients: recipients?.length || 0,
      subject: subject ? 'Present' : 'Missing',
      html: html ? 'Present' : 'Missing',
      materialIds: materialIds?.length || 0
    });

    // Validate request
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      console.error('❌ Invalid recipients:', recipients);
      return res.status(400).json({
        success: false,
        error: 'Recipients array is required and must not be empty'
      });
    }

    if (!subject || !html) {
      console.error('❌ Missing subject or html:', { subject: !!subject, html: !!html });
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

    console.log(`📧 Smart Email Sending: ${recipients.length} recipients via ${emailConfig.provider} (${recipients.length >= 3 ? 'Batch API' : 'Individual API'})...`);
    console.log(`📧 Subject: ${subject}`);
    if (materials.length > 0) {
      console.log(`📎 Including ${materials.length} material links:`, materials.map(m => m.title).join(', '));
    }

    // Use the HTML as-is since it's now always a complete template from client
    let standardizedHtml = html;
    console.log('📧 Using pre-processed template from client for recipientType:', recipientType || 'guardians');
    console.log('📎 Materials will be handled by client-side template processing');
    console.log(`📧 Using ${emailConfig.provider} with batch size: ${emailConfig.batch_size}`);

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

    console.log(`✅ Successfully sent ${results.success.length} emails, ${results.failed.length} failed using ${emailConfig.provider} ${recipients.length >= 3 ? 'Batch' : 'Individual'} API`);

    return res.status(200).json({
      success: true,
      message: `Email processing completed using ${emailConfig.provider} ${recipients.length >= 3 ? 'Batch' : 'Individual'} API`,
      data: {
        total: results.total,
        successful: results.success.length,
        failed: results.failed.length,
        successRate: ((results.success.length / results.total) * 100).toFixed(1) + '%',
        failures: results.failed.length > 0 ? results.failed : undefined
      }
    });
  } catch (error) {
    console.error('❌ Send batch email error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send batch emails'
    });
  }
});

// Cal.com API endpoints
app.post('/api/calcom/bookings', async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required'
      });
    }

    console.log('📅 Fetching Cal.com bookings:', {
      from: startDate,
      to: endDate
    });

    // Cal.com API v2 - Get personal account bookings
    // Filter: upcoming and past bookings (exclude cancelled)
    const params = new URLSearchParams({
      afterStart: new Date(startDate).toISOString(),
      beforeEnd: new Date(endDate).toISOString(),
      status: 'upcoming,past'
    });

    const apiUrl = `${CALCOM_CONFIG.apiBase}/bookings?${params.toString()}`;
    
    console.log('🔗 Fetching from:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CALCOM_CONFIG.apiKey}`,
        'cal-api-version': CALCOM_CONFIG.apiVersion,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Cal.com API Error:', errorText);
      throw new Error(`Cal.com API error: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Successfully fetched', data.data?.length || 0, 'bookings');
    
    if (data.data && data.data.length > 0) {
      console.log('📅 Sample booking:', JSON.stringify(data.data[0], null, 2));
    }

    return res.status(200).json({
      success: true,
      bookings: data.data || [],
      pagination: data.pagination || {}
    });
  } catch (error) {
    console.error('❌ Cal.com bookings fetch error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch Cal.com bookings'
    });
  }
});

// Cal.com Webhook Handler (POST and GET for testing)
app.all('/api/calcom/webhook', async (req, res) => {
  // Handle GET requests (for browser testing)
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      message: 'Cal.com webhook endpoint is ready',
      methods: ['POST'],
      timestamp: new Date().toISOString()
    });
  }

  try {
    // Handle ping test from Cal.com
    if (req.body.triggerEvent === 'PING' || !req.body.triggerEvent) {
      console.log('🏓 Cal.com webhook ping test received');
      return res.status(200).json({ 
        received: true,
        message: 'Webhook endpoint is working!',
        timestamp: new Date().toISOString()
      });
    }

    const signature = req.headers['x-cal-signature-256'];
    const webhookSecret = CALCOM_CONFIG.webhookSecret;

    // Verify webhook signature (Cal.com uses HMAC SHA256)
    if (webhookSecret && signature) {
      const crypto = require('crypto');
      // Use raw body for signature verification
      const body = req.rawBody || JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('❌ Invalid webhook signature');
        console.error('Expected:', expectedSignature);
        console.error('Received:', signature);
        return res.status(401).json({ error: 'Invalid signature' });
      }
      
      console.log('✅ Webhook signature verified');
    }

    const { triggerEvent, payload } = req.body;

    console.log('🔔 Cal.com Webhook received:', {
      event: triggerEvent,
      bookingId: payload?.uid,
      attendee: payload?.attendees?.[0]?.email,
      timestamp: new Date().toISOString()
    });
    
    // Log full payload for debugging
    console.log('📦 Full payload:', JSON.stringify(payload, null, 2));

    // Service mapping
    const SERVICE_MAP = {
      'First Service': 1,
      'Second Service': 2,
      'Third Service': 3
    };

    const mapTimeToService = (startTime) => {
      const time = new Date(startTime).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Manila'
      });
      
      if (time === '10:00') return 'First Service';
      if (time === '13:00') return 'Second Service';
      if (time === '15:30') return 'Third Service';
      
      return null;
    };

    // Initialize Supabase admin client with service key
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Handle different webhook events
    switch (triggerEvent) {
      case 'BOOKING_CREATED':
        console.log('✅ Processing BOOKING_CREATED:', payload.uid);
        console.log('📅 Payload start time:', payload.start);
        console.log('📅 Payload startTime:', payload.startTime);
        
        // Try both start and startTime fields
        const startTime = payload.start || payload.startTime;
        
        if (!startTime) {
          console.error('❌ No start time found in payload');
          break;
        }
        
        const serviceName = mapTimeToService(startTime);
        if (!serviceName) {
          console.warn('⚠️  Could not map time to service:', startTime);
          break;
        }
        
        const serviceId = SERVICE_MAP[serviceName];
        const attendee = payload.attendees?.[0];
        const attendeeEmail = attendee?.email;
        const organizerEmail = payload.hosts?.[0]?.email;
        
        // Skip organizer bookings
        if (attendeeEmail === organizerEmail || attendeeEmail === 'info@nextgen-ccf.org') {
          console.log('ℹ️  Skipping organizer booking');
          break;
        }
        
        // Extract physical role from Cal.com's userFieldsResponses structure
        let physicalRole = 'Volunteer';
        
        // Primary location: payload.userFieldsResponses.physical_role.value
        if (payload.userFieldsResponses?.physical_role?.value) {
          physicalRole = payload.userFieldsResponses.physical_role.value;
        } 
        // Fallback: payload.responses.physical_role.value
        else if (payload.responses?.physical_role?.value) {
          physicalRole = payload.responses.physical_role.value;
        }
        // Legacy fallback
        else if (attendee?.responses?.physical_role?.value) {
          physicalRole = attendee.responses.physical_role.value;
        }
        
        console.log('✅ Extracted physical role:', physicalRole);
        const assignmentDate = new Date(startTime).toISOString().split('T')[0];
        
        // Lookup staff by email
        const { data: staffData } = await supabaseAdmin
          .from('staff')
          .select('staff_id')
          .eq('email', attendeeEmail.toLowerCase())
          .eq('is_active', true)
          .single();
        
        const staffId = staffData?.staff_id || null;
        if (!staffId) {
          console.warn('⚠️  Staff member not found for email:', attendeeEmail);
        }
        
        // Calculate duration in minutes - Cal.com uses 'length' field
        let durationMinutes = payload.length || payload.duration;
        if (!durationMinutes && startTime && (payload.endTime || payload.end)) {
          const start = new Date(startTime);
          const end = new Date(payload.endTime || payload.end);
          durationMinutes = Math.round((end - start) / 60000);
        }
        
        console.log('⏱️  Duration:', durationMinutes, 'minutes');
        
        // Insert or update assignment
        const assignmentData = {
          staff_id: staffId,
          service_id: serviceId,
          assignment_date: assignmentDate,
          calcom_booking_id: payload.uid,
          calcom_event_type_id: payload.eventTypeId,
          physical_role: physicalRole,
          booking_status: (payload.status || 'accepted').toLowerCase(), // Convert to lowercase!
          attendee_email: attendeeEmail,
          attendee_name: attendee?.name,
          start_time: startTime,
          end_time: payload.endTime || payload.end,
          duration_minutes: durationMinutes,
          location: payload.location,
          notes: payload.additionalNotes || null,
          updated_at: new Date().toISOString()
        };
        
        const { data: insertData, error: insertError } = await supabaseAdmin
          .from('staff_assignments')
          .upsert(assignmentData, { 
            onConflict: 'calcom_booking_id',
            ignoreDuplicates: false 
          })
          .select();
        
        if (insertError) {
          console.error('❌ Error saving booking to Supabase:', insertError);
        } else {
          console.log('✅ Booking saved to Supabase:', {
            bookingId: payload.uid,
            staffId,
            serviceName,
            attendee: attendeeEmail,
            role: physicalRole
          });
        }
        break;

      case 'BOOKING_RESCHEDULED':
        console.log('🔄 Processing BOOKING_RESCHEDULED:', payload.uid);
        
        const newServiceName = mapTimeToService(payload.start);
        if (!newServiceName) {
          console.warn('⚠️  Could not map time to service:', payload.start);
          break;
        }
        
        const newServiceId = SERVICE_MAP[newServiceName];
        const newAssignmentDate = new Date(payload.start).toISOString().split('T')[0];
        
        const { error: updateError } = await supabaseAdmin
          .from('staff_assignments')
          .update({
            service_id: newServiceId,
            assignment_date: newAssignmentDate,
            start_time: payload.start,
            end_time: payload.end,
            duration_minutes: payload.duration,
            booking_status: payload.status || 'accepted',
            updated_at: new Date().toISOString()
          })
          .eq('calcom_booking_id', payload.uid);
        
        if (updateError) {
          console.error('❌ Error updating booking:', updateError);
        } else {
          console.log('✅ Booking rescheduled in Supabase:', payload.uid);
        }
        break;

      case 'BOOKING_CANCELLED':
        console.log('❌ Processing BOOKING_CANCELLED:', payload.uid);
        
        const { error: cancelError } = await supabaseAdmin
          .from('staff_assignments')
          .delete()
          .eq('calcom_booking_id', payload.uid);
        
        if (cancelError) {
          console.error('❌ Error deleting cancelled booking:', cancelError);
        } else {
          console.log('✅ Booking deleted from Supabase:', payload.uid);
        }
        break;

      case 'BOOKING_REJECTED':
        console.log('⛔ Processing BOOKING_REJECTED:', payload.uid);
        
        const { error: rejectError } = await supabaseAdmin
          .from('staff_assignments')
          .update({
            booking_status: 'rejected',
            updated_at: new Date().toISOString()
          })
          .eq('calcom_booking_id', payload.uid);
        
        if (rejectError) {
          console.error('❌ Error rejecting booking:', rejectError);
        } else {
          console.log('✅ Booking rejected in Supabase:', payload.uid);
        }
        break;

      default:
        console.log('ℹ️  Unhandled webhook event:', triggerEvent);
    }

    // Acknowledge webhook receipt
    return res.status(200).json({ 
      received: true,
      event: triggerEvent,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return res.status(500).json({ 
      error: 'Webhook processing failed',
      message: error.message 
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
  console.log(`   - POST /api/email/send-child-qr`);
  console.log(`   - GET/POST /api/email/config`);
  console.log(`📅 Cal.com API endpoints available at http://localhost:${PORT}/api/calcom/*`);
  console.log(`   - POST /api/calcom/bookings`);
  console.log(`   - POST /api/calcom/webhook\n`);
});
