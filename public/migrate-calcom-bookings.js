/**
 * One-time Migration Script: Cal.com → Supabase
 * Copies existing Cal.com bookings into Supabase staff_assignments table
 * Run this once to populate historical data
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_KEY;
const CALCOM_API_KEY = process.env.VITE_CALCOM_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Service mapping
const SERVICE_MAP = {
  'First Service': 1,
  'Second Service': 2,
  'Third Service': 3
};

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
 * Fetch all bookings from Cal.com API
 */
async function fetchCalcomBookings() {
  try {
    console.log('📡 Fetching bookings from Cal.com API...');
    
    // Get bookings from 6 months ago to 3 months ahead
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);
    
    const response = await fetch('http://localhost:3001/api/calcom/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })
    });
    
    if (!response.ok) {
      throw new Error(`Cal.com API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ Fetched ${data.bookings?.length || 0} bookings from Cal.com`);
    
    return data.bookings || [];
  } catch (error) {
    console.error('❌ Error fetching Cal.com bookings:', error);
    throw error;
  }
}

/**
 * Migrate a single booking to Supabase
 */
async function migrateBooking(booking) {
  try {
    // Try multiple possible locations for start time (matching webhook logic)
    const startTime = booking.start || 
                     booking.startTime || 
                     booking.booking?.start || 
                     booking.booking?.startTime ||
                     booking.metadata?.startTime;
    
    if (!startTime) {
      console.warn(`⚠️  No start time found for booking: ${booking.uid}`);
      return { success: false, reason: 'No start time' };
    }
    
    const serviceName = mapTimeToService(startTime);
    if (!serviceName) {
      console.warn(`⚠️  Could not map time to service: ${startTime}`);
      return { success: false, reason: 'No service mapping' };
    }
    
    const serviceId = SERVICE_MAP[serviceName];
    const attendee = booking.attendees?.[0];
    const attendeeEmail = attendee?.email;
    const organizerEmail = booking.hosts?.[0]?.email;
    
    // Skip organizer bookings
    if (attendeeEmail === organizerEmail || attendeeEmail === 'info@nextgen-ccf.org') {
      return { success: false, reason: 'Organizer booking' };
    }
    
    // Extract physical role with multiple fallbacks (matching webhook logic)
    let physicalRole = 'Volunteer';
    if (booking.userFieldsResponses?.physical_role?.value) {
      physicalRole = booking.userFieldsResponses.physical_role.value;
    } else if (booking.responses?.physical_role?.value) {
      physicalRole = booking.responses.physical_role.value;
    } else if (attendee?.responses?.physical_role?.value) {
      physicalRole = attendee.responses.physical_role.value;
    } else if (attendee?.bookingFieldsResponses?.physical_role) {
      physicalRole = attendee.bookingFieldsResponses.physical_role;
    }
    
    // Get assignment date
    const assignmentDate = new Date(startTime).toISOString().split('T')[0];
    
    // Try multiple possible locations for end time
    const endTime = booking.end || 
                   booking.endTime || 
                   booking.booking?.end || 
                   booking.booking?.endTime ||
                   booking.metadata?.endTime;
    
    // Lookup staff by email
    const { data: staffData } = await supabase
      .from('staff')
      .select('staff_id')
      .eq('email', attendeeEmail.toLowerCase())
      .eq('is_active', true)
      .single();
    
    const staffId = staffData?.staff_id || null;
    
    // Calculate duration
    let durationMinutes = booking.length || booking.duration;
    if (!durationMinutes && startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      durationMinutes = Math.round((end - start) / 60000);
    }
    
    // Prepare assignment data
    const assignmentData = {
      staff_id: staffId,
      service_id: serviceId,
      assignment_date: assignmentDate,
      calcom_booking_id: booking.uid,
      calcom_event_type_id: booking.eventTypeId,
      physical_role: physicalRole,
      booking_status: (booking.status || 'accepted').toLowerCase(),
      attendee_email: attendeeEmail,
      attendee_name: attendee?.name,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes,
      location: booking.location,
      notes: booking.description || booking.additionalNotes || null,
      updated_at: new Date().toISOString()
    };
    
    // Upsert to Supabase
    const { error } = await supabase
      .from('staff_assignments')
      .upsert(assignmentData, { 
        onConflict: 'calcom_booking_id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error(`❌ Error migrating booking ${booking.uid}:`, error.message);
      return { success: false, reason: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error(`❌ Error migrating booking:`, error);
    return { success: false, reason: error.message };
  }
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting Cal.com → Supabase migration...\n');
  
  try {
    // Fetch bookings from Cal.com
    const bookings = await fetchCalcomBookings();
    
    if (bookings.length === 0) {
      console.log('ℹ️  No bookings to migrate');
      return;
    }
    
    console.log(`\n📦 Migrating ${bookings.length} bookings...\n`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    // Migrate each booking
    for (const booking of bookings) {
      const result = await migrateBooking(booking);
      
      if (result.success) {
        successCount++;
        console.log(`✅ ${successCount}/${bookings.length} - Migrated: ${booking.uid}`);
      } else if (result.reason === 'Organizer booking' || result.reason === 'No service mapping') {
        skipCount++;
        console.log(`⏭️  Skipped: ${booking.uid} (${result.reason})`);
      } else {
        errorCount++;
        console.error(`❌ Failed: ${booking.uid} - ${result.reason}`);
      }
    }
    
    console.log('\n✅ Migration complete!');
    console.log(`   Migrated: ${successCount}`);
    console.log(`   Skipped: ${skipCount}`);
    console.log(`   Errors: ${errorCount}`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate();
