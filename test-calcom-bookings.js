/**
 * Test script to fetch Cal.com bookings and see payload structure
 */

import axios from 'axios';

async function fetchBookings() {
  const apiKey = 'cal_live_35a9ec076c4985d6e3fe94111d9b1074';
  const apiBase = 'https://api.cal.com/v2';
  const apiVersion = '2024-08-13';
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30); // Past 30 days
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 7); // Next 7 days
  
  const params = new URLSearchParams({
    afterStart: startDate.toISOString(),
    beforeEnd: endDate.toISOString()
  });
  
  const url = `${apiBase}/bookings?${params.toString()}`;
  
  console.log('📅 Fetching bookings from:', startDate.toISOString().split('T')[0]);
  console.log('📅 To:', endDate.toISOString().split('T')[0]);
  console.log('🔗 URL:', url);
  console.log('');
  
  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'cal-api-version': apiVersion,
        'Content-Type': 'application/json'
      }
    });
    
    const data = response.data;
    console.log('✅ Total bookings found:', data.data?.length || 0);
    console.log('');
    
    if (data.data && data.data.length > 0) {
      console.log('📦 FULL BOOKING PAYLOADS:');
      console.log('='.repeat(80));
      
      data.data.forEach((booking, index) => {
        console.log(`\nBOOKING #${index + 1}:`);
        console.log('  ID:', booking.uid);
        console.log('  Title:', booking.title);
        console.log('  Status:', booking.status);
        console.log('  Start:', booking.start);
        console.log('  End:', booking.end);
        console.log('  Duration:', booking.duration || booking.length);
        console.log('  Attendees Count:', booking.attendees?.length || 0);
        
        if (booking.attendees && booking.attendees.length > 0) {
          console.log('  Attendees:');
          booking.attendees.forEach((attendee, idx) => {
            console.log(`    ${idx + 1}. ${attendee.name} (${attendee.email})`);
          });
        }
        
        if (booking.hosts && booking.hosts.length > 0) {
          console.log('  Hosts:');
          booking.hosts.forEach((host, idx) => {
            console.log(`    ${idx + 1}. ${host.name} (${host.email})`);
          });
        }
        
        console.log('\n  Full payload:');
        console.log(JSON.stringify(booking, null, 2));
        console.log('-'.repeat(80));
      });
      
      // Check for multi-attendee bookings
      const multiAttendeeBookings = data.data.filter(b => b.attendees && b.attendees.length > 1);
      if (multiAttendeeBookings.length > 0) {
        console.log('\n⚠️  MULTI-ATTENDEE BOOKINGS DETECTED:');
        console.log(`Found ${multiAttendeeBookings.length} bookings with multiple attendees`);
        multiAttendeeBookings.forEach((booking, index) => {
          console.log(`\n${index + 1}. ${booking.uid} - ${booking.attendees.length} attendees`);
          booking.attendees.forEach((att, idx) => {
            console.log(`   ${idx + 1}. ${att.name} (${att.email})`);
          });
        });
      }
    } else {
      console.log('No bookings found in this date range');
    }
  } catch (error) {
    console.error('❌ Fetch error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

fetchBookings();
