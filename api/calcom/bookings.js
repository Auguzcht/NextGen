/**
 * Cal.com Bookings Fetcher (Vercel Serverless Function)
 * Production endpoint: https://nextgen-ccf.org/api/calcom/bookings
 * Fetches bookings from Cal.com API v2
 */

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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

    // Cal.com API configuration
    const apiKey = process.env.VITE_CALCOM_API_KEY;
    const apiBase = process.env.VITE_CALCOM_API_BASE || 'https://api.cal.com/v2';
    const apiVersion = '2024-08-13';

    if (!apiKey) {
      console.error('❌ Missing Cal.com API key');
      return res.status(500).json({
        success: false,
        error: 'Cal.com API not configured'
      });
    }

    // Cal.com API v2 - Get personal account bookings
    // Filter: upcoming and past bookings (exclude cancelled)
    const params = new URLSearchParams({
      afterStart: new Date(startDate).toISOString(),
      beforeEnd: new Date(endDate).toISOString(),
      status: 'upcoming,past'
    });

    const apiUrl = `${apiBase}/bookings?${params.toString()}`;
    
    console.log('🔗 Fetching from Cal.com API...');

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'cal-api-version': apiVersion,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Cal.com API Error:', errorText);
      return res.status(response.status).json({
        success: false,
        error: `Cal.com API error: ${errorText}`
      });
    }

    const data = await response.json();
    console.log('✅ Successfully fetched', data.data?.length || 0, 'bookings');
    
    if (data.data && data.data.length > 0) {
      console.log('📅 Sample booking:', {
        id: data.data[0].uid,
        title: data.data[0].title,
        start: data.data[0].start,
        hasCustomFields: !!data.data[0].bookingFieldsResponses
      });
    }

    return res.status(200).json({
      success: true,
      bookings: data.data || [],
      pagination: data.pagination || {},
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Cal.com bookings fetch error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch Cal.com bookings'
    });
  }
}
