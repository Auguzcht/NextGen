/**
 * Send Staff Credentials Email API Endpoint
 * Sends login credentials with password reset links to all staff members with UUID
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client
// In production (Vercel), use non-VITE prefixed vars
// In development, fall back to VITE_ prefixed vars
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[send-credentials] Missing Supabase credentials:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseServiceKey,
    env: process.env.NODE_ENV,
    availableVars: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
  });
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  console.log('[send-credentials] Function invoked:', {
    method: req.method,
    hasBody: !!req.body,
    supabaseConfigured: !!(supabaseUrl && supabaseServiceKey)
  });

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if Supabase is properly initialized
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[send-credentials] Supabase not initialized - missing environment variables');
    return res.status(500).json({
      error: 'Server configuration error',
      details: 'Missing Supabase credentials. Please check environment variables in Vercel.'
    });
  }

  try {
    const { staffMembers, eventType = 'new_account' } = req.body;

    console.log('[send-credentials] Request received:', { 
      staffCount: staffMembers?.length, 
      eventType,
      env: process.env.NODE_ENV 
    });

    if (!staffMembers || !Array.isArray(staffMembers) || staffMembers.length === 0) {
      console.error('[send-credentials] Invalid staff members:', staffMembers);
      return res.status(400).json({ error: 'No staff members provided' });
    }

    // Get email configuration from database
    console.log('[send-credentials] Fetching email config...');
    const { data: emailConfig, error: configError } = await supabaseAdmin
      .from('email_api_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (configError || !emailConfig) {
      console.error('[send-credentials] Email config error:', configError);
      return res.status(500).json({ 
        error: 'Email configuration not found',
        details: configError?.message 
      });
    }

    console.log('[send-credentials] Email config found:', { provider: emailConfig.provider });

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

    // Send email to each staff member using Supabase templates
    for (const staff of staffMembers) {
      try {
        console.log(`[send-credentials] Processing staff: ${staff.email}`);
        
        // Determine redirect URL based on environment
        // Helper function for consistent redirect URL logic
        const getRedirectUrl = () => {
          // Priority 1: Explicit SITE_URL (set in Vercel)
          if (process.env.SITE_URL) {
            return process.env.SITE_URL;
          }
          
          // Priority 2: Vercel deployment URL (always HTTPS)
          if (process.env.VERCEL_URL) {
            return `https://${process.env.VERCEL_URL}`;
          }
          
          // Priority 3: Production domain (fallback)
          if (process.env.NODE_ENV === 'production') {
            return 'https://www.nextgen-ccf.org';
          }
          
          // Priority 4: Development (localhost)
          return 'http://localhost:3002';
        };

        const redirectUrl = getRedirectUrl();
        console.log(`[send-credentials] Using redirect URL: ${redirectUrl}`);

        if (eventType === 'password_reset' || eventType === 'access_reminder') {
          // Use Supabase's resetPasswordForEmail (sends "Reset Password" template)
          const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
            staff.email,
            {
              redirectTo: `${redirectUrl}/reset-password`
            }
          );

          if (resetError) {
            console.error(`[send-credentials] Reset email failed for ${staff.email}:`, resetError);
            results.failed.push({
              email: staff.email,
              name: `${staff.first_name} ${staff.last_name}`,
              error: resetError.message
            });
            continue;
          }

          console.log(`[send-credentials] Reset email sent to ${staff.email}`);
          results.success.push({
            email: staff.email,
            name: `${staff.first_name} ${staff.last_name}`,
            type: 'password_reset'
          });
        } else {
          // Use Supabase's inviteUserByEmail for new accounts/reactivation (sends "Invite User" template)
          // This uses the Magic Link template and redirects to dashboard
          const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
            staff.email,
            {
              redirectTo: `${redirectUrl}/dashboard`,
              data: {
                first_name: staff.first_name,
                last_name: staff.last_name,
                role: staff.role
              }
            }
          );

          if (inviteError) {
            console.error(`[send-credentials] Invite failed for ${staff.email}:`, inviteError);
            results.failed.push({
              email: staff.email,
              name: `${staff.first_name} ${staff.last_name}`,
              error: inviteError.message
            });
            continue;
          }

          console.log(`[send-credentials] Invite sent to ${staff.email}`);
          results.success.push({
            email: staff.email,
            name: `${staff.first_name} ${staff.last_name}`,
            type: 'magic_link'
          });
        }
      } catch (emailError) {
        console.error(`[send-credentials] Error sending to ${staff.email}:`, emailError);
        results.failed.push({
          email: staff.email,
          name: `${staff.first_name} ${staff.last_name}`,
          error: emailError.message
        });
      }
    }

    console.log('[send-credentials] Results:', { 
      success: results.success.length, 
      failed: results.failed.length 
    });

    return res.status(200).json({
      success: true,
      message: `Sent ${results.success.length} out of ${results.total} emails`,
      successCount: results.success.length,
      failureCount: results.failed.length,
      results: results.success,
      errors: results.failed.map(f => `${f.name} (${f.email}): ${f.error}`)
    });
  } catch (error) {
    console.error('[send-credentials] Fatal error:', error);
    console.error('[send-credentials] Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
