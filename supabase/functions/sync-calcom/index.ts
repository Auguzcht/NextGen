// Supabase Edge Function: sync-calcom
// Deploy: supabase functions deploy sync-calcom
// Invoke: https://tezhepmzrfrvnyjejizb.supabase.co/functions/v1/sync-calcom

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Service mapping
const SERVICE_MAP = {
  'First Service': 1,
  'Second Service': 2,
  'Third Service': 3
};

function mapTimeToService(startTime: string): string | null {
  const date = new Date(startTime);
  const time = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Manila'
  });

  if (time === '10:00') return 'First Service';
  if (time === '13:00') return 'Second Service';
  if (time === '15:30') return 'Third Service';

  return null;
}

function getManilaDate(dateTime: string): string {
  return new Date(dateTime).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

async function fetchCalcomBookings(apiKey: string, startDate: Date, endDate: Date) {
  const params = new URLSearchParams({
    afterStart: startDate.toISOString(),
    beforeEnd: endDate.toISOString(),
    status: 'upcoming,past'
  });

  const url = `https://api.cal.com/v2/bookings?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'cal-api-version': '2024-08-13',
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Cal.com API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data || [];
}

function transformBooking(booking: any, attendee: any) {
  const startTime = booking.start;
  const serviceName = mapTimeToService(startTime);

  if (!serviceName) return null;

  const serviceId = SERVICE_MAP[serviceName];
  const assignmentDate = getManilaDate(startTime); // Use Manila timezone
  const organizerEmail = booking.hosts?.[0]?.email;

  // Skip organizer
  if (attendee.email === organizerEmail || attendee.email === 'info@nextgen-ccf.org') {
    return null;
  }

  // Extract physical role
  let physicalRole = 'Volunteer';
  if (attendee?.bookingFieldsResponses?.physical_role) {
    physicalRole = attendee.bookingFieldsResponses.physical_role;
  }

  // Calculate duration
  let durationMinutes = booking.duration || booking.length;
  if (!durationMinutes && booking.start && booking.end) {
    const start = new Date(booking.start);
    const end = new Date(booking.end);
    durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔄 Starting Cal.com sync...');

    // Get environment variables
    const calcomApiKey = Deno.env.get('CALCOM_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!calcomApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ONE-TIME CLEANUP: Delete all existing Cal.com assignments to fix timezone issues
    console.log('🧹 Cleaning up existing Cal.com assignments...');
    const { error: cleanupError } = await supabase
      .from('staff_assignments')
      .delete()
      .not('calcom_booking_id', 'is', null);
    
    if (cleanupError) {
      console.error('⚠️ Cleanup error:', cleanupError);
    } else {
      console.log('✅ Cleanup complete - all Cal.com assignments deleted');
    }

    // Fetch bookings from last 7 days and next 365 days (entire year)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 365);

    console.log(`📅 Fetching bookings from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    const rawBookings = await fetchCalcomBookings(calcomApiKey, startDate, endDate);
    console.log(`📦 Fetched ${rawBookings.length} bookings from Cal.com`);

    // Get existing assignments
    const { data: existingAssignments } = await supabase
      .from('staff_assignments')
      .select('calcom_booking_id, attendee_email, updated_at')
      .gte('assignment_date', startDate.toISOString().split('T')[0])
      .not('calcom_booking_id', 'is', null);

    const existingMap = new Map();
    existingAssignments?.forEach((assignment: any) => {
      const key = `${assignment.calcom_booking_id}:${assignment.attendee_email}`;
      existingMap.set(key, assignment);
    });

    console.log(`💾 Found ${existingAssignments?.length || 0} existing assignments`);

    // Transform and prepare assignments
    const assignmentsToUpsert = [];
    let skippedCount = 0;

    for (const booking of rawBookings) {
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

        if (!existing || new Date(booking.updatedAt) > new Date(existing.updated_at)) {
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

    console.log(`🔍 Found ${assignmentsToUpsert.length} new/updated assignments`);

    // Batch upsert
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

      console.log(`✅ Synced ${data?.length || 0} assignments`);
    }

    // Handle deleted bookings
    const calcomBookingIds = new Set(rawBookings.map((b: any) => b.uid));
    const assignmentsToDelete = existingAssignments?.filter(
      (a: any) => !calcomBookingIds.has(a.calcom_booking_id)
    ) || [];

    if (assignmentsToDelete.length > 0) {
      const bookingIdsToDelete = [...new Set(assignmentsToDelete.map((a: any) => a.calcom_booking_id))];

      const { error: deleteError } = await supabase
        .from('staff_assignments')
        .delete()
        .in('calcom_booking_id', bookingIdsToDelete);

      if (!deleteError) {
        console.log(`✅ Cleaned up ${assignmentsToDelete.length} cancelled assignments`);
      }
    }

    const result = {
      success: true,
      processed: rawBookings.length,
      synced: assignmentsToUpsert.length,
      deleted: assignmentsToDelete.length,
      skipped: skippedCount,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Sync completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Sync failed:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
