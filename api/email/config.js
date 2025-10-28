import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Email Configuration API
 * GET: Fetch email configuration
 * POST: Update email configuration
 */
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Fetch email configuration
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

      // Validate required fields
      if (!provider || !api_key || !from_email || !from_name) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      // Check if config exists
      const { data: existingConfig } = await supabase
        .from('email_api_config')
        .select('config_id')
        .single();

      let result;
      if (existingConfig) {
        // Update existing config
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
        // Insert new config
        result = await supabase
          .from('email_api_config')
          .insert({
            provider,
            api_key,
            from_email,
            from_name,
            batch_size: batch_size || 100,
            is_active: is_active !== undefined ? is_active : true,
            updated_by
          })
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
}
