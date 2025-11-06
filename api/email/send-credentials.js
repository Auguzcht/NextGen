/**
 * Send Staff Credentials Email API Endpoint
 * Sends login credentials with password reset links to all staff members with UUID
 */

import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { staffMembers, eventType = 'new_account' } = req.body;

    if (!staffMembers || !Array.isArray(staffMembers) || staffMembers.length === 0) {
      return res.status(400).json({ error: 'No staff members provided' });
    }

    // Get email configuration from database
    const { data: emailConfig, error: configError } = await supabaseAdmin
      .from('email_api_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (configError || !emailConfig) {
      console.error('Error fetching email config:', configError);
      return res.status(500).json({ error: 'Email configuration not found' });
    }

    // Initialize Resend with API key from database
    const resend = new Resend(emailConfig.api_key);

    if (!staffMembers || !Array.isArray(staffMembers) || staffMembers.length === 0) {
      return res.status(400).json({ error: 'No staff members provided' });
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
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #30cee4 0%, #2ba5c7 100%); padding: 40px 20px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">NextGen Ministry</h1>
                        <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">${config.title}</p>
                      </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                      <td style="padding: 40px 30px;">
                        <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 22px;">Hello ${staff.first_name}!</h2>
                        
                        <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                          ${config.greeting}
                        </p>
                        
                        <div style="background-color: #f8f9fa; border-left: 4px solid #30cee4; padding: 20px; margin: 20px 0; border-radius: 4px;">
                          <p style="margin: 0 0 10px 0; color: #333333; font-size: 14px;"><strong>Email:</strong> ${staff.email}</p>
                          <p style="margin: 0 0 10px 0; color: #333333; font-size: 14px;"><strong>Role:</strong> ${staff.role}</p>
                        </div>
                        
                        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                          <p style="margin: 0; color: #856404; font-size: 14px;">
                            <strong>⚠️ Action Required:</strong> ${config.note}
                          </p>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                          <a href="${resetLink}" 
                             style="display: inline-block; background-color: #30cee4; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                            ${config.buttonText}
                          </a>
                        </div>
                        
                        <p style="color: #999999; font-size: 12px; margin: 20px 0; text-align: center; font-style: italic;">
                          This link will expire in 24 hours for security reasons.
                        </p>
                        
                        <p style="color: #666666; line-height: 1.6; margin: 20px 0 0 0; font-size: 14px;">
                          If you have any questions or need help, please contact your administrator.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #e9ecef;">
                        <p style="color: #999999; font-size: 12px; margin: 0; text-align: center;">
                          This is an automated message from NextGen Ministry Management System.<br/>
                          Please do not reply to this email.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;

        const { data, error } = await resend.emails.send({
          from: `${emailConfig.from_name} <${emailConfig.from_email}>`,
          to: [staff.email],
          subject: config.subject,
          html: emailHtml,
        });

        if (error) {
          console.error(`Failed to send email to ${staff.email}:`, error);
          results.failed.push({
            email: staff.email,
            name: `${staff.first_name} ${staff.last_name}`,
            error: error.message
          });
        } else {
          results.success.push({
            email: staff.email,
            name: `${staff.first_name} ${staff.last_name}`,
            messageId: data.id
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
      results
    });
  } catch (error) {
    console.error('Error in send-credentials endpoint:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
