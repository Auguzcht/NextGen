/**
 * Manual Sync Endpoint
 * Can be called from admin UI or manually via API
 * No auth required from admin users (relies on Supabase auth)
 */

import { syncCalcomBookings } from '../calcom/sync.js';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔄 Manual sync triggered by admin:', {
      timestamp: new Date().toISOString(),
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    });

    // Optional: Verify user is authenticated admin
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        console.warn('⚠️  Unauthorized manual sync attempt');
        return res.status(401).json({ 
          success: false, 
          error: 'Unauthorized' 
        });
      }

      console.log('✅ Authorized user:', user.email);
    }

    // Run the sync
    const result = await syncCalcomBookings();

    console.log('✅ Manual sync completed:', result);

    return res.status(200).json({
      success: true,
      message: 'Manual sync completed successfully',
      ...result
    });

  } catch (error) {
    console.error('❌ Manual sync failed:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Sync failed',
      timestamp: new Date().toISOString()
    });
  }
}
