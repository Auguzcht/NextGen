/**
 * Cal.com Webhook Handler (Vercel Serverless Function)
 * Production endpoint: https://nextgen-ccf.org/api/calcom/webhook
 * Receives real-time booking events from Cal.com
 * Stores bookings in Supabase for real-time updates
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

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

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Cal-Signature-256');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle GET request (Cal.com ping test sometimes uses GET)
  if (req.method === 'GET') {
    console.log('🏓 Cal.com webhook GET ping received');
    return res.status(200).json({ 
      received: true,
      message: 'Webhook endpoint is active!',
      timestamp: new Date().toISOString()
    });
  }

  // Only accept POST requests for actual webhooks
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Handle ping test from Cal.com (POST with PING event)
    if (!req.body || req.body.triggerEvent === 'PING' || !req.body.triggerEvent) {
      console.log('🏓 Cal.com webhook POST ping received');
      return res.status(200).json({ 
        received: true,
        message: 'Webhook endpoint is working!',
        timestamp: new Date().toISOString()
      });
    }

    const signature = req.headers['x-cal-signature-256'];
    const webhookSecret = process.env.CALCOM_WEBHOOK_SECRET || process.env.VITE_CALCOM_WEBHOOK_SECRET;

    // Verify webhook signature (Cal.com uses HMAC SHA256)
    if (webhookSecret && signature) {
      // In Vercel, req.body is already parsed, so we need to reconstruct it
      // For signature verification, we need the raw body string
      const body = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('❌ Invalid webhook signature');
        console.error('Note: Vercel auto-parses body. If signature fails, check Cal.com webhook configuration');
        res.status(401).json({ error: 'Invalid signature' });
        return;
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
    
    // DEBUG: Log full payload to see Cal.com's actual structure
    console.log('📦 Full webhook payload:', JSON.stringify(payload, null, 2));

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
        console.log('ℹ️  Unhandled webhook event:', triggerEvent);
    }

    // Acknowledge webhook receipt
    return res.status(200).json({ 
      received: true,
      event: triggerEvent,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return res.status(500).json({ 
      error: 'Webhook processing failed',
      message: error.message 
    });
  }
}

/**
 * Handle BOOKING_CREATED event
 * Creates a new staff assignment in Supabase
 * FIXED: Now handles multiple attendees per booking
 */
async function handleBookingCreated(payload) {
  try {
    console.log('✅ Processing BOOKING_CREATED:', payload.uid);
    
    // Try multiple possible locations for start time
    const startTime = payload.start || 
                     payload.startTime || 
                     payload.booking?.start || 
                     payload.booking?.startTime ||
                     payload.metadata?.startTime;
    
    if (!startTime) {
      console.error('❌ No start time found in payload');
      console.error('❌ Full payload:', JSON.stringify(payload, null, 2));
      return;
    }
    
    console.log('🕐 Using startTime:', startTime);
    const serviceName = mapTimeToService(startTime);
    if (!serviceName) {
      console.warn('⚠️  Could not map time to service:', startTime);
      console.warn('⚠️  Payload structure:', JSON.stringify(payload, null, 2));
      return;
    }
    
    const serviceId = SERVICE_MAP[serviceName];
    const assignmentDate = new Date(startTime).toISOString().split('T')[0];
    const organizerEmail = payload.hosts?.[0]?.email;
    
    // Try multiple possible locations for end time
    const endTime = payload.end || 
                   payload.endTime || 
                   payload.booking?.end || 
                   payload.booking?.endTime ||
                   payload.metadata?.endTime;
    
    // Calculate duration - Cal.com uses 'length' field
    let durationMinutes = payload.length || payload.duration;
    if (!durationMinutes && startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      durationMinutes = Math.round((end - start) / 60000);
    }
    
    // 🔧 FIX: Process ALL attendees, not just the first one
    const attendees = payload.attendees || [];
    
    if (attendees.length === 0) {
      console.warn('⚠️  No attendees found in booking:', payload.uid);
      return;
    }
    
    console.log(`📋 Processing ${attendees.length} attendee(s) for booking ${payload.uid}`);
    
    const assignments = [];
    const errors = [];
    
    for (const attendee of attendees) {
      const attendeeEmail = attendee?.email;
      
      if (!attendeeEmail) {
        console.warn('⚠️  Attendee without email found, skipping');
        continue;
      }
      
      // Skip if attendee is the organizer
      if (attendeeEmail === organizerEmail || attendeeEmail === 'info@nextgen-ccf.org') {
        console.log('ℹ️  Skipping organizer booking:', attendeeEmail);
        continue;
      }
      
      // Extract physical role from attendee's bookingFieldsResponses
      let physicalRole = 'Volunteer';
      if (attendee?.bookingFieldsResponses?.physical_role) {
        physicalRole = attendee.bookingFieldsResponses.physical_role;
      } else if (payload.userFieldsResponses?.physical_role?.value) {
        physicalRole = payload.userFieldsResponses.physical_role.value;
      } else if (payload.responses?.physical_role?.value) {
        physicalRole = payload.responses.physical_role.value;
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
      
      // Prepare assignment data for this attendee
      const assignmentData = {
        staff_id: staffId,
        service_id: serviceId,
        assignment_date: assignmentDate,
        calcom_booking_id: payload.uid, // Same booking ID for all attendees
        calcom_event_type_id: payload.eventTypeId,
        physical_role: physicalRole,
        booking_status: (payload.status || 'accepted').toLowerCase(),
        attendee_email: attendeeEmail, // 🔑 Unique per attendee
        attendee_name: attendee?.name,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: durationMinutes,
        location: payload.location,
        notes: payload.additionalNotes || null,
        updated_at: new Date().toISOString()
      };
      
      assignments.push(assignmentData);
      
      console.log(`  ✓ Prepared assignment for ${attendee.name} (${attendeeEmail}) as ${physicalRole}`);
    }
    
    // 🔧 FIX: Batch insert all assignments for this booking
    if (assignments.length > 0) {
      const { data, error } = await supabase
        .from('staff_assignments')
        .upsert(assignments, { 
          onConflict: 'calcom_booking_id,attendee_email', // Composite unique key
          ignoreDuplicates: false 
        })
        .select();
      
      if (error) {
        console.error('❌ Error saving bookings to Supabase:', error);
        throw error;
      }
      
      console.log(`✅ Saved ${assignments.length} assignment(s) for booking ${payload.uid}`);
      
      // Log summary
      data?.forEach((assignment, index) => {
        console.log(`  ${index + 1}. ${assignment.attendee_name} - ${assignment.physical_role}`);
      });
    } else {
      console.log('ℹ️  No valid attendees to process for booking:', payload.uid);
    }
    
  } catch (error) {
    console.error('❌ Error in handleBookingCreated:', error);
    throw error;
  }
}

/**
 * Handle BOOKING_RESCHEDULED event
 * Updates existing staff assignments with new time/service
 * FIXED: Now updates all attendees for this booking
 */
async function handleBookingRescheduled(payload) {
  try {
    console.log('🔄 Processing BOOKING_RESCHEDULED:', payload.uid);
    
    // Try multiple possible locations for start time
    const startTime = payload.start || 
                     payload.startTime || 
                     payload.booking?.start || 
                     payload.booking?.startTime ||
                     payload.metadata?.startTime;
    
    if (!startTime) {
      console.error('❌ No start time found in reschedule payload');
      return;
    }
    
    const serviceName = mapTimeToService(startTime);
    if (!serviceName) {
      console.warn('⚠️  Could not map time to service:', startTime);
      return;
    }
    
    const serviceId = SERVICE_MAP[serviceName];
    const assignmentDate = new Date(startTime).toISOString().split('T')[0];
    
    // Try multiple possible locations for end time
    const endTime = payload.end || 
                   payload.endTime || 
                   payload.booking?.end || 
                   payload.booking?.endTime ||
                   payload.metadata?.endTime;
    
    // Update ALL assignments for this booking (all attendees)
    const { data, error } = await supabase
      .from('staff_assignments')
      .update({
        service_id: serviceId,
        assignment_date: assignmentDate,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: payload.duration || payload.length,
        booking_status: (payload.status || 'accepted').toLowerCase(),
        updated_at: new Date().toISOString()
      })
      .eq('calcom_booking_id', payload.uid)
      .select();
    
    if (error) {
      console.error('❌ Error updating booking:', error);
      throw error;
    }
    
    console.log(`✅ Rescheduled ${data?.length || 0} assignment(s) for booking ${payload.uid}`);
  } catch (error) {
    console.error('❌ Error in handleBookingRescheduled:', error);
    throw error;
  }
}

/**
 * Handle BOOKING_CANCELLED event
 * Deletes all staff assignment records for this booking
 * FIXED: Now deletes all attendees for this booking
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
    
    console.log(`✅ Deleted ${data?.length || 0} assignment(s) for cancelled booking ${payload.uid}`);
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
