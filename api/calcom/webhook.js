/**
 * Cal.com Webhook Handler (Vercel Serverless Function)
 * Production endpoint: https://nextgen-ccf.org/api/calcom/webhook
 * Receives real-time booking events from Cal.com
 * Stores bookings in Supabase for real-time updates
 */

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client - Use non-VITE vars for production
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Service name to service_id mapping
const SERVICE_MAP = {
  'First Service': 1,   // 10:00 AM
  'Second Service': 2,  // 1:00 PM
  'Third Service': 3    // 3:30 PM
};

/**
 * Maps Cal.com time to service name
 */
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

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Cal-Signature-256');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  // Only accept POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Handle ping test from Cal.com
    if (req.body.triggerEvent === 'PING' || !req.body.triggerEvent) {
      console.log('🏓 Cal.com webhook ping test received');
      res.status(200).json({ 
        received: true,
        message: 'Webhook endpoint is working!',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const signature = req.headers['x-cal-signature-256'];
    const webhookSecret = process.env.CALCOM_WEBHOOK_SECRET || process.env.VITE_CALCOM_WEBHOOK_SECRET;
    const webhookSecret = process.env.VITE_CALCOM_WEBHOOK_SECRET;

    // Verify webhook signature (Cal.com uses HMAC SHA256)
    if (webhookSecret && signature) {
      // In Vercel, req.body is already parsed, so we need to reconstruct it
      // For signature verification, we need the raw body string
      const body = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
      if (signature !== expectedSignature) {
        console.error('❌ Invalid webhook signature');
        console.error('Note: Vercel auto-parses body. If signature fails, check Cal.com webhook configuration');
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }
      
      console.log('✅ Webhook signature verified');
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

    // Handle different webhook events
    switch (triggerEvent) {
      case 'BOOKING_CREATED':
        await handleBookingCreated(payload);
        break;

      case 'BOOKING_RESCHEDULED':
        await handleBookingRescheduled(payload);
        break;

      case 'BOOKING_CANCELLED':
        await handleBookingCancelled(payload);
        break;

      case 'BOOKING_REJECTED':
        await handleBookingRejected(payload);
        break;

      default:
    // Acknowledge webhook receipt
    res.status(200).json({ 
      received: true,
      event: triggerEvent,
      timestamp: new Date().toISOString()
    });
    return;
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({ 
      error: 'Webhook processing failed',
      message: error.message 
    });
    return;
  }
};     message: error.message 
    });
  }
}

/**
 * Handle BOOKING_CREATED event
 * Creates a new staff assignment in Supabase
 */
async function handleBookingCreated(payload) {
  try {
    console.log('✅ Processing BOOKING_CREATED:', payload.uid);
    
    const serviceName = mapTimeToService(payload.start);
    if (!serviceName) {
      console.warn('⚠️  Could not map time to service:', payload.start);
      return;
    }
    
    const serviceId = SERVICE_MAP[serviceName];
    const attendee = payload.attendees?.[0];
    const attendeeEmail = attendee?.email;
    const organizerEmail = payload.hosts?.[0]?.email;
    
    // Skip if attendee is the organizer
    if (attendeeEmail === organizerEmail || attendeeEmail === 'info@nextgen-ccf.org') {
      console.log('ℹ️  Skipping organizer booking');
      return;
    }
    
    // Extract physical role from Cal.com's userFieldsResponses structure
    let physicalRole = 'Volunteer';
    if (payload.userFieldsResponses?.physical_role?.value) {
      physicalRole = payload.userFieldsResponses.physical_role.value;
    } else if (payload.responses?.physical_role?.value) {
      physicalRole = payload.responses.physical_role.value;
    } else if (attendee?.responses?.physical_role?.value) {
      physicalRole = attendee.responses.physical_role.value;
    }
    
    // Get assignment date (date only, no time)
    const assignmentDate = new Date(payload.start || payload.startTime).toISOString().split('T')[0];
    
    // Calculate duration - Cal.com uses 'length' field
    let durationMinutes = payload.length || payload.duration;
    if (!durationMinutes && (payload.start || payload.startTime) && (payload.end || payload.endTime)) {
      const start = new Date(payload.start || payload.startTime);
      const end = new Date(payload.end || payload.endTime);
      durationMinutes = Math.round((end - start) / 60000);
    }
    
    // Lookup staff member by email
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('staff_id')
      .eq('email', attendeeEmail.toLowerCase())
      .eq('is_active', true)
      .single();
    
    if (staffError || !staffData) {
      console.warn('⚠️  Staff member not found for email:', attendeeEmail);
      // Continue anyway - store with null staff_id
    }
    
    const staffId = staffData?.staff_id || null;
    
    // Insert or update staff assignment
    const assignmentData = {
      staff_id: staffId,
      service_id: serviceId,
      assignment_date: assignmentDate,
      role_at_service: physicalRole,
      calcom_booking_id: payload.uid,
      calcom_event_type_id: payload.eventTypeId,
      physical_role: physicalRole,
      booking_status: (payload.status || 'accepted').toLowerCase(),
      attendee_email: attendeeEmail,
      attendee_name: attendee?.name,
      start_time: payload.start || payload.startTime,
      end_time: payload.end || payload.endTime,
      duration_minutes: durationMinutes,
      location: payload.location,
      notes: payload.additionalNotes || null,
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('staff_assignments')
      .upsert(assignmentData, { 
        onConflict: 'calcom_booking_id',
        ignoreDuplicates: false 
      })
      .select();
    
    if (error) {
      console.error('❌ Error saving booking to Supabase:', error);
      throw error;
    }
    
    console.log('✅ Booking saved to Supabase:', {
      bookingId: payload.uid,
      staffId,
      serviceName,
      attendee: attendeeEmail,
      role: physicalRole
    });
  } catch (error) {
    console.error('❌ Error in handleBookingCreated:', error);
    throw error;
  }
}

/**
 * Handle BOOKING_RESCHEDULED event
 * Updates existing staff assignment with new time/service
 */
async function handleBookingRescheduled(payload) {
  try {
    console.log('🔄 Processing BOOKING_RESCHEDULED:', payload.uid);
    
    const serviceName = mapTimeToService(payload.start);
    if (!serviceName) {
      console.warn('⚠️  Could not map time to service:', payload.start);
      return;
    }
    
    const serviceId = SERVICE_MAP[serviceName];
    const assignmentDate = new Date(payload.start).toISOString().split('T')[0];
    
    // Update existing assignment
    const { data, error } = await supabase
      .from('staff_assignments')
      .update({
        service_id: serviceId,
        assignment_date: assignmentDate,
        start_time: payload.start,
        end_time: payload.end,
        duration_minutes: payload.duration,
        booking_status: payload.status || 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('calcom_booking_id', payload.uid)
      .select();
    
    if (error) {
      console.error('❌ Error updating booking:', error);
      throw error;
    }
    
    console.log('✅ Booking rescheduled in Supabase:', payload.uid);
  } catch (error) {
    console.error('❌ Error in handleBookingRescheduled:', error);
    throw error;
  }
}

/**
 * Handle BOOKING_CANCELLED event
 * Deletes the staff assignment record
 */
async function handleBookingCancelled(payload) {
  try {
    console.log('❌ Processing BOOKING_CANCELLED:', payload.uid);
    
    const { data, error } = await supabase
      .from('staff_assignments')
      .delete()
      .eq('calcom_booking_id', payload.uid)
      .select();
    
    if (error) {
      console.error('❌ Error deleting cancelled booking:', error);
      throw error;
    }
    
    console.log('✅ Booking deleted from Supabase:', payload.uid);
  } catch (error) {
    console.error('❌ Error in handleBookingCancelled:', error);
    throw error;
  }
}

/**
 * Handle BOOKING_REJECTED event
 * Updates booking status to rejected
 */
async function handleBookingRejected(payload) {
  try {
    console.log('⛔ Processing BOOKING_REJECTED:', payload.uid);
    
    const { data, error } = await supabase
      .from('staff_assignments')
      .update({
        booking_status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('calcom_booking_id', payload.uid)
      .select();
    
    if (error) {
      console.error('❌ Error rejecting booking:', error);
      throw error;
    }
    
    console.log('✅ Booking rejected in Supabase:', payload.uid);
  } catch (error) {
    console.error('❌ Error in handleBookingRejected:', error);
    throw error;
  }
}
