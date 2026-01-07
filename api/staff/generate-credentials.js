/**
 * Generate Credentials API Endpoint
 * Automatically creates Supabase auth accounts for all staff without user_id
 * and sends them temporary password reset credentials
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[generate-credentials] Missing Supabase credentials:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseServiceKey
  });
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Helper function for redirect URL
const getRedirectUrl = () => {
  if (process.env.SITE_URL) {
    return process.env.SITE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NODE_ENV === 'production') {
    return 'https://www.nextgen-ccf.org';
  }
  return 'http://localhost:3002';
};

export default async function handler(req, res) {
  console.log('[generate-credentials] Function invoked:', {
    method: req.method,
    hasBody: !!req.body
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
    console.error('[generate-credentials] Supabase not initialized');
    return res.status(500).json({
      error: 'Server configuration error',
      details: 'Missing Supabase credentials'
    });
  }

  try {
    const { staffIds, bulkGenerate = false } = req.body;

    console.log('[generate-credentials] Request received:', {
      staffIds: staffIds?.length,
      bulkGenerate
    });

    // Query for staff without login credentials
    let query = supabaseAdmin
      .from('staff')
      .select('*')
      .is('user_id', null)
      .eq('is_active', true);

    // If specific staff IDs provided, filter by them
    if (staffIds && Array.isArray(staffIds) && staffIds.length > 0) {
      query = query.in('staff_id', staffIds);
    }

    const { data: staffWithoutLogin, error: queryError } = await query;

    if (queryError) {
      console.error('[generate-credentials] Query error:', queryError);
      return res.status(500).json({
        error: 'Database query failed',
        details: queryError.message
      });
    }

    if (!staffWithoutLogin || staffWithoutLogin.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No staff members need credentials',
        results: {
          success: [],
          failed: [],
          total: 0
        }
      });
    }

    console.log(`[generate-credentials] Found ${staffWithoutLogin.length} staff without login`);

    const redirectUrl = getRedirectUrl();
    const results = {
      success: [],
      failed: [],
      total: staffWithoutLogin.length
    };

    // Process each staff member
    for (const staff of staffWithoutLogin) {
      try {
        console.log(`[generate-credentials] Processing: ${staff.email}`);

        // Step 1: Create Supabase auth user
        const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: staff.email,
          email_confirm: true, // Skip email verification
          user_metadata: {
            first_name: staff.first_name,
            last_name: staff.last_name,
            role: staff.role,
            staff_id: staff.staff_id,
            access_level: staff.access_level || 1
          }
        });

        if (createError) {
          // Check if user already exists
          if (createError.message.includes('already registered')) {
            console.log(`[generate-credentials] User already exists: ${staff.email}`);
            
            // Try to get existing user
            const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = existingUsers?.users?.find(u => u.email === staff.email);
            
            if (existingUser) {
              // Update staff table with existing user_id
              const { error: updateError } = await supabaseAdmin
                .from('staff')
                .update({
                  user_id: existingUser.id,
                  credentials_sent_at: new Date().toISOString(),
                  credentials_sent_count: (staff.credentials_sent_count || 0) + 1
                })
                .eq('staff_id', staff.staff_id);

              if (updateError) {
                console.error(`[generate-credentials] Update error: ${updateError.message}`);
                results.failed.push({
                  staff_id: staff.staff_id,
                  name: `${staff.first_name} ${staff.last_name}`,
                  email: staff.email,
                  error: `Failed to update staff record: ${updateError.message}`
                });
                continue;
              }

              // Send password reset email
              const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
                staff.email,
                { redirectTo: `${redirectUrl}/reset-password` }
              );

              if (resetError) {
                console.error(`[generate-credentials] Reset email error: ${resetError.message}`);
                results.failed.push({
                  staff_id: staff.staff_id,
                  name: `${staff.first_name} ${staff.last_name}`,
                  email: staff.email,
                  error: `Failed to send email: ${resetError.message}`
                });
                continue;
              }

              results.success.push({
                staff_id: staff.staff_id,
                name: `${staff.first_name} ${staff.last_name}`,
                email: staff.email,
                user_id: existingUser.id,
                status: 'linked_existing'
              });
              continue;
            }
          }

          console.error(`[generate-credentials] Create user error: ${createError.message}`);
          results.failed.push({
            staff_id: staff.staff_id,
            name: `${staff.first_name} ${staff.last_name}`,
            email: staff.email,
            error: createError.message
          });
          continue;
        }

        console.log(`[generate-credentials] Created user: ${authUser.user.id}`);

        // Step 2: Link user_id to staff table
        const { error: updateError } = await supabaseAdmin
          .from('staff')
          .update({
            user_id: authUser.user.id,
            credentials_sent_at: new Date().toISOString(),
            credentials_sent_count: (staff.credentials_sent_count || 0) + 1
          })
          .eq('staff_id', staff.staff_id);

        if (updateError) {
          console.error(`[generate-credentials] Update error: ${updateError.message}`);
          results.failed.push({
            staff_id: staff.staff_id,
            name: `${staff.first_name} ${staff.last_name}`,
            email: staff.email,
            error: `User created but failed to link: ${updateError.message}`
          });
          continue;
        }

        // Step 3: Send password reset email (Supabase template)
        const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
          staff.email,
          { redirectTo: `${redirectUrl}/reset-password` }
        );

        if (resetError) {
          console.error(`[generate-credentials] Reset email error: ${resetError.message}`);
          results.failed.push({
            staff_id: staff.staff_id,
            name: `${staff.first_name} ${staff.last_name}`,
            email: staff.email,
            error: `User created but email failed: ${resetError.message}`
          });
          continue;
        }

        console.log(`[generate-credentials] Success: ${staff.email}`);
        results.success.push({
          staff_id: staff.staff_id,
          name: `${staff.first_name} ${staff.last_name}`,
          email: staff.email,
          user_id: authUser.user.id,
          status: 'created'
        });

      } catch (error) {
        console.error(`[generate-credentials] Error processing ${staff.email}:`, error);
        results.failed.push({
          staff_id: staff.staff_id,
          name: `${staff.first_name} ${staff.last_name}`,
          email: staff.email,
          error: error.message
        });
      }
    }

    console.log('[generate-credentials] Results:', {
      success: results.success.length,
      failed: results.failed.length,
      total: results.total
    });

    return res.status(200).json({
      success: true,
      message: `Generated credentials for ${results.success.length} out of ${results.total} staff members`,
      results
    });

  } catch (error) {
    console.error('[generate-credentials] Fatal error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
