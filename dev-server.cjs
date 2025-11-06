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

    // Send email to each staff member
    for (const staff of staffMembers) {
      try {
        // Generate password reset link
        const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: staff.email,
        });

        if (resetError) {
          console.error(`Failed to generate reset link for ${staff.email}:`, resetError);
          throw resetError;
        }

        const resetLink = resetData.properties.action_link;
        
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your NextGen Ministry Login Credentials</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="background: linear-gradient(135deg, #30cee4 0%, #2ba5c7 100%); padding: 40px 20px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">NextGen Ministry</h1>
                        <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">${config.title}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 40px 30px;">
                        <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 22px;">Hello ${staff.first_name}!</h2>
                        <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${config.greeting}</p>
                        <div style="background-color: #f8f9fa; border-left: 4px solid #30cee4; padding: 20px; margin: 20px 0; border-radius: 4px;">
                          <p style="margin: 0 0 10px 0; color: #333333; font-size: 14px;"><strong>Email:</strong> ${staff.email}</p>
                          <p style="margin: 0 0 10px 0; color: #333333; font-size: 14px;"><strong>Role:</strong> ${staff.role}</p>
                        </div>
                        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                          <p style="margin: 0; color: #856404; font-size: 14px;"><strong>⚠️ Action Required:</strong> ${config.note}</p>
                        </div>
                        <div style="text-align: center; margin: 30px 0;">
                          <a href="${resetLink}" style="display: inline-block; background-color: #30cee4; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">${config.buttonText}</a>
                        </div>
                        <p style="color: #999999; font-size: 12px; margin: 20px 0; text-align: center; font-style: italic;">This link will expire in 24 hours for security reasons.</p>
                        <p style="color: #666666; line-height: 1.6; margin: 20px 0 0 0; font-size: 14px;">If you have any questions or need help, please contact your administrator.</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #e9ecef;">
                        <p style="color: #999999; font-size: 12px; margin: 0; text-align: center;">This is an automated message from NextGen Ministry Management System.<br/>Please do not reply to this email.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;

        // Send email via Resend
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${emailConfig.api_key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: `${emailConfig.from_name} <${emailConfig.from_email}>`,
            to: [staff.email],
            subject: config.subject,
            html: emailHtml,
          })
        });

        if (!emailResponse.ok) {
          const error = await emailResponse.json();
          throw new Error(error.message || emailResponse.statusText);
        }

        const emailResult = await emailResponse.json();

        results.success.push({
          email: staff.email,
          name: `${staff.first_name} ${staff.last_name}`,
          messageId: emailResult.id
        });
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
  console.log(`📧 Email API endpoints available at http://localhost:${PORT}/api/email/*\n`);
});
