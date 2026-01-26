/**
 * Staff Assignment Service
 * Fetches volunteer schedules from Supabase (populated by Cal.com webhooks)
 * Provides real-time updates without polling Cal.com API
 */

import supabase from './supabase.js';

/**
 * Fetches staff assignments from Supabase for a date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} - Array of assignments with staff and service details
 */
export const fetchStaffAssignments = async (startDate, endDate) => {
  try {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log('📅 Fetching staff assignments from Supabase:', {
      from: startDateStr,
      to: endDateStr
    });
    
    const { data, error } = await supabase
      .from('staff_assignments')
      .select(`
        *,
        staff:staff_id (
          staff_id,
          first_name,
          last_name,
          email,
          phone_number,
          role,
          profile_image_url,
          profile_image_path
        ),
        services:service_id (
          service_id,
          service_name,
          start_time,
          end_time,
          day_of_week
        )
      `)
      .gte('assignment_date', startDateStr)
      .lte('assignment_date', endDateStr)
      .not('booking_status', 'eq', 'cancelled') // Show all except cancelled
      .order('assignment_date', { ascending: true })
      .order('start_time', { ascending: true });
    
    if (error) throw error;
    
    console.log('✅ Fetched', data?.length || 0, 'staff assignments from Supabase');
    
    return data || [];
  } catch (error) {
    console.error('❌ Error fetching staff assignments:', error);
    throw error;
  }
};

/**
 * Transforms Supabase staff assignments to calendar event format
 * @param {Array} assignments - Raw assignments from Supabase
 * @returns {Array} - Transformed events for calendar display
 */
export const transformAssignmentsToEvents = (assignments) => {
  if (!Array.isArray(assignments)) return [];
  
  return assignments.map(assignment => {
    const staff = assignment.staff;
    const service = assignment.services;
    
    // Generate staff gradient
    const staffGradient = getStaffGradient(staff?.staff_id || assignment.attendee_email);
    
    return {
      id: assignment.calcom_booking_id || assignment.assignment_id,
      title: `${assignment.attendee_name || staff?.first_name + ' ' + staff?.last_name} - ${assignment.physical_role}`,
      description: assignment.notes || '',
      start: new Date(assignment.start_time),
      end: new Date(assignment.end_time),
      startTime: new Date(assignment.start_time).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Manila'
      }),
      endTime: new Date(assignment.end_time).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Manila'
      }),
      serviceName: service?.service_name,
      location: assignment.location || '',
      status: assignment.booking_status,
      isAllDay: false,
      // Volunteer information
      volunteerName: assignment.attendee_name || (staff ? `${staff.first_name} ${staff.last_name}` : 'Unknown'),
      firstName: staff?.first_name || assignment.attendee_name?.split(' ')[0],
      lastName: staff?.last_name || assignment.attendee_name?.split(' ').slice(1).join(' '),
      volunteerEmail: assignment.attendee_email || staff?.email,
      phone: staff?.phone_number,
      physicalRole: assignment.physical_role,
      role: assignment.physical_role,
      profileImage: staff?.profile_image_url,
      profilePath: staff?.profile_image_path,
      staffId: staff?.staff_id,
      staffRole: staff?.role,
      isRegisteredStaff: !!staff,
      profileGradient: staffGradient,
      // Cal.com data
      duration: assignment.duration_minutes,
      calcomBookingId: assignment.calcom_booking_id,
      // Assignment data
      assignmentId: assignment.assignment_id,
      serviceId: assignment.service_id,
      assignmentDate: assignment.assignment_date,
      checkInTime: assignment.check_in_time,
      checkOutTime: assignment.check_out_time
    };
  });
};

/**
 * Helper: Generate staff gradient for profile avatars
 */
const getStaffGradient = (identifier) => {
  const colors = [
    'from-nextgen-blue to-nextgen-blue-dark',
    'from-nextgen-orange to-nextgen-orange-dark',
    'from-nextgen-blue-light to-nextgen-blue',
    'from-nextgen-orange-light to-nextgen-orange',
    'from-blue-500 to-indigo-600',
    'from-orange-500 to-amber-500'
  ];
  
  const identifierStr = String(identifier || 'default');
  const hash = identifierStr.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  
  const index = hash % colors.length;
  return colors[index];
};

/**
 * Gets staff statistics from Supabase assignments
 * @param {string} staffEmail - Staff member's email address
 * @param {Date} startDate - Optional start date (defaults to 6 months ago)
 * @param {Date} endDate - Optional end date (defaults to 3 months ahead)
 * @returns {Promise<Object>} - Statistics object with counts and recent assignment
 */
export const getStaffStatisticsFromDB = async (staffEmail, startDate = null, endDate = null) => {
  try {
    if (!staffEmail) {
      return {
        totalAssignments: 0,
        upcomingAssignments: 0,
        servicesWorked: 0,
        recentAssignment: null
      };
    }
    
    // Default date range
    if (!startDate) {
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6);
    }
    if (!endDate) {
      endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);
    }
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log('📊 Getting statistics from DB for:', staffEmail);
    
    // Fetch all assignments for this staff member
    const { data, error } = await supabase
      .from('staff_assignments')
      .select(`
        *,
        services:service_id (
          service_id,
          service_name,
          day_of_week,
          start_time
        )
      `)
      .eq('attendee_email', staffEmail.toLowerCase())
      .gte('assignment_date', startDateStr)
      .lte('assignment_date', endDateStr)
      .not('booking_status', 'eq', 'cancelled')
      .order('assignment_date', { ascending: false });
    
    if (error) throw error;
    
    const assignments = data || [];
    
    if (assignments.length === 0) {
      console.log('ℹ️  No assignments found for', staffEmail);
      return {
        totalAssignments: 0,
        upcomingAssignments: 0,
        servicesWorked: 0,
        recentAssignment: null
      };
    }
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Calculate statistics
    const totalAssignments = assignments.length;
    const upcomingAssignments = assignments.filter(a => 
      new Date(a.assignment_date) >= todayStart
    ).length;
    
    // Count past assignments (services worked)
    const servicesWorked = assignments.filter(a => 
      new Date(a.assignment_date) < todayStart
    ).length;
    
    // Get most recent assignment
    const recentAssignment = assignments[0] ? {
      assignment_date: assignments[0].start_time,
      role: assignments[0].physical_role || 'volunteer',
      notes: assignments[0].notes,
      services: {
        service_name: assignments[0].services?.service_name,
        day_of_week: assignments[0].services?.day_of_week || 
          new Date(assignments[0].start_time).toLocaleDateString('en-US', { weekday: 'long' }),
        start_time: assignments[0].services?.start_time ||
          new Date(assignments[0].start_time).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          })
      }
    } : null;
    
    console.log('📈 Statistics from DB:', {
      totalAssignments,
      upcomingAssignments,
      servicesWorked
    });
    
    return {
      totalAssignments,
      upcomingAssignments,
      servicesWorked,
      recentAssignment
    };
  } catch (error) {
    console.error('❌ Error getting staff statistics from DB:', error);
    return {
      totalAssignments: 0,
      upcomingAssignments: 0,
      servicesWorked: 0,
      recentAssignment: null
    };
  }
};

export default {
  fetchStaffAssignments,
  transformAssignmentsToEvents,
  getStaffStatisticsFromDB
};
