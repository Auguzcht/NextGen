/**
 * Cal.com Sync Service
 * Polls Cal.com API and syncs bookings to Supabase
 * Acts as backup for webhooks and handles reconciliation
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Service mapping
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

/**
 * Fetch bookings from Cal.com API
 */
async function fetchCalcomBookings(startDate, endDate) {
  const apiKey = process.env.CALCOM_API_KEY || process.env.VITE_CALCOM_API_KEY;
  const apiBase = process.env.CALCOM_API_BASE || process.env.VITE_CALCOM_API_BASE || 'https://api.cal.com/v2';
  const apiVersion = '2024-08-13';
  
  if (!apiKey) {
    throw new Error('Cal.com API key not configured');
  }
  
  const params = new URLSearchParams({
    afterStart: startDate.toISOString(),
    beforeEnd: endDate.toISOString(),
    status: 'upcoming,past' // Only get active bookings, not cancelled
  });
  
  const url = `${apiBase}/bookings?${params.toString()}`;
  
  console.log('🔗 Fetching from Cal.com API:', url);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'cal-api-version': apiVersion,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cal.com API error: ${response.status} ${errorText}`);
  }
  
  const data = await response.json();
  return data.data || [];
}

/**
 * Transform Cal.com booking to Supabase assignment format
 */
function transformBooking(booking, attendee) {
  const startTime = booking.start;
  const serviceName = mapTimeToService(startTime);
  
  if (!serviceName) {
    console.warn('⚠️  Could not map time to service:', startTime);
    return null;
  }
  
  const serviceId = SERVICE_MAP[serviceName];
  const assignmentDate = new Date(startTime).toISOString().split('T')[0];
  const organizerEmail = booking.hosts?.[0]?.email;
  
  // Skip if attendee is the organizer
  if (attendee.email === organizerEmail || attendee.email === 'info@nextgen-ccf.org') {
    return null;
  }
  
  // Extract physical role from attendee's bookingFieldsResponses
  let physicalRole = 'Volunteer';
  if (attendee?.bookingFieldsResponses?.physical_role) {
    physicalRole = attendee.bookingFieldsResponses.physical_role;
  }
  
  // Calculate duration
  let durationMinutes = booking.duration || booking.length;
  if (!durationMinutes && booking.start && booking.end) {
    const start = new Date(booking.start);
    const end = new Date(booking.end);
    durationMinutes = Math.round((end - start) / 60000);
  }
  
  return {
    calcom_booking_id: booking.uid,
    calcom_event_type_id: booking.eventTypeId,
    service_id: serviceId,
    assignment_date: assignmentDate,
    physical_role: physicalRole,
    booking_status: (booking.status || 'accepted').toLowerCase(),
    attendee_email: attendee.email,
    attendee_name: attendee.name,
    start_time: booking.start,
    end_time: booking.end,
    duration_minutes: durationMinutes,
    location: booking.location,
    notes: booking.description || null,
    updated_at: new Date().toISOString()
  };
}

/**
 * Main sync function
 * Fetches bookings from Cal.com and syncs to Supabase
 */
export async function syncCalcomBookings() {
  try {
    console.log('🔄 Starting Cal.com sync...');
    
    // Fetch bookings from last 7 days and next 30 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    
    console.log(`📅 Syncing bookings from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    
    // Fetch from Cal.com
    const rawBookings = await fetchCalcomBookings(startDate, endDate);
    console.log(`📦 Fetched ${rawBookings.length} bookings from Cal.com`);
    
    // Get existing assignments from database for comparison
    const { data: existingAssignments } = await supabase
      .from('staff_assignments')
      .select('calcom_booking_id, attendee_email, updated_at')
      .gte('assignment_date', startDate.toISOString().split('T')[0])
      .not('calcom_booking_id', 'is', null);
    
    // Create a map of existing assignments
    const existingMap = new Map();
    existingAssignments?.forEach(assignment => {
      const key = `${assignment.calcom_booking_id}:${assignment.attendee_email}`;
      existingMap.set(key, assignment);
    });
    
    console.log(`💾 Found ${existingAssignments?.length || 0} existing assignments in database`);
    
    // Transform and prepare assignments to upsert
    const assignmentsToUpsert = [];
    let skippedCount = 0;
    
    for (const booking of rawBookings) {
      // Skip cancelled bookings
      if (booking.status === 'cancelled' || booking.status === 'rejected') {
        continue;
      }
      
      const attendees = booking.attendees || [];
      
      for (const attendee of attendees) {
        if (!attendee.email) continue;
        
        const transformed = transformBooking(booking, attendee);
        if (!transformed) {
          skippedCount++;
          continue;
        }
        
        const key = `${booking.uid}:${attendee.email}`;
        const existing = existingMap.get(key);
        
        // Check if assignment needs update
        if (!existing || 
            new Date(booking.updatedAt) > new Date(existing.updated_at)) {
          
          // Lookup staff member
          const { data: staffData } = await supabase
            .from('staff')
            .select('staff_id')
            .eq('email', attendee.email.toLowerCase())
            .eq('is_active', true)
            .single();
          
          transformed.staff_id = staffData?.staff_id || null;
          
          assignmentsToUpsert.push(transformed);
        }
      }
    }
    
    console.log(`🔍 Found ${assignmentsToUpsert.length} new/updated assignments to sync`);
    console.log(`⏭️  Skipped ${skippedCount} organizer/invalid bookings`);
    
    // Batch upsert missing/outdated assignments
    if (assignmentsToUpsert.length > 0) {
      const { data, error } = await supabase
        .from('staff_assignments')
        .upsert(assignmentsToUpsert, {
          onConflict: 'calcom_booking_id,attendee_email',
          ignoreDuplicates: false
        })
        .select();
      
      if (error) {
        console.error('❌ Sync error:', error);
        throw error;
      }
      
      console.log(`✅ Synced ${data?.length || 0} assignments to database`);
      
      // Log summary
      data?.forEach((assignment, index) => {
        console.log(`  ${index + 1}. ${assignment.attendee_name} (${assignment.attendee_email}) - ${assignment.physical_role}`);
      });
    } else {
      console.log('✅ All bookings are up to date');
    }
    
    // Handle deleted/cancelled bookings
    // Find assignments in DB that no longer exist in Cal.com
    const calcomBookingIds = new Set(rawBookings.map(b => b.uid));
    const assignmentsToDelete = [];
    
    existingAssignments?.forEach(assignment => {
      if (!calcomBookingIds.has(assignment.calcom_booking_id)) {
        assignmentsToDelete.push(assignment);
      }
    });
    
    if (assignmentsToDelete.length > 0) {
      console.log(`🗑️  Found ${assignmentsToDelete.length} cancelled bookings to clean up`);
      
      const bookingIdsToDelete = [...new Set(assignmentsToDelete.map(a => a.calcom_booking_id))];
      
      const { error: deleteError } = await supabase
        .from('staff_assignments')
        .delete()
        .in('calcom_booking_id', bookingIdsToDelete);
      
      if (deleteError) {
        console.error('❌ Error deleting cancelled bookings:', deleteError);
      } else {
        console.log(`✅ Cleaned up ${assignmentsToDelete.length} cancelled assignments`);
      }
    }
    
    return {
      success: true,
      processed: rawBookings.length,
      synced: assignmentsToUpsert.length,
      deleted: assignmentsToDelete.length,
      skipped: skippedCount,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    throw error;
  }
}

// Export for use in other modules
export default syncCalcomBookings;
