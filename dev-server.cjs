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
