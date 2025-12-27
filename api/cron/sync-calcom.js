/**
 * Vercel Cron Job: Sync Cal.com Bookings
 * Endpoint: /api/cron/sync-calcom
 * Schedule: Every 10 minutes (configured in vercel.json)
 * Purpose: Polls Cal.com API and syncs bookings to Supabase
 */

import { syncCalcomBookings } from '../calcom/sync.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('🔔 Cron endpoint hit:', {
    method: req.method,
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'],
    authorization: req.headers['authorization'] ? 'Present' : 'Missing'
  });

  try {
    // Security: Verify request is from Vercel Cron or authorized source
    const authHeader = req.headers['authorization'];
    const cronSecret = process.env.CRON_SECRET;
    
    // Check if request is from Vercel Cron (has specific header)
    const isVercelCron = req.headers['user-agent']?.includes('vercel-cron');
    
    // Check if request has valid authorization
    const isAuthorized = authHeader === `Bearer ${cronSecret}`;
    
    console.log('🔐 Authorization check:', {
      isVercelCron,
      isAuthorized,
      hasSecret: !!cronSecret
    });
    
    if (!isVercelCron && !isAuthorized) {
      console.warn('⚠️  Unauthorized cron request attempt');
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }
    
    console.log('🕐 Starting Cal.com sync...');
    
    // Run the sync
    const result = await syncCalcomBookings();
    
    console.log('✅ Cron job completed successfully:', result);
    
    return res.status(200).json({
      success: true,
      message: 'Cal.com sync completed',
      ...result
    });
    
  } catch (error) {
    console.error('❌ Cron job failed:', error);
    console.error('Stack trace:', error.stack);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Sync failed',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
}
