/**
 * Cal.com API Service
 * Handles booking fetching and webhook processing via backend proxy
 * Direct access to booking data including custom form fields (physical_role)
 */

import supabase from './supabase';

const CALCOM_CONFIG = {
  apiBase: import.meta.env.VITE_CALCOM_API_BASE || 'https://api.cal.com/v2',
  apiKey: import.meta.env.VITE_CALCOM_API_KEY
};

// Cache for bookings to avoid repeated API calls
let bookingsCache = {
  data: null,
  timestamp: null,
  startDate: null,
  endDate: null
};

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache

// Use backend API URL based on environment
const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:3001' : '';

// Service time slot mapping for Cal.com bookings
const SERVICE_TIME_SLOTS = {
  'First Service': { start: '10:00', end: '12:00' },
  'Second Service': { start: '13:00', end: '15:00' },
  'Third Service': { start: '15:30', end: '17:30' }
};

/**
 * Maps time string to service name
 * @param {string} timeStr - Time in HH:mm format
 * @returns {string|null} - Service name or null
 */
const mapTimeToService = (timeStr) => {
  if (!timeStr) return null;
  
  const time = timeStr.substring(0, 5); // Get HH:mm part
  
  // Check which service this time belongs to
  if (time === '10:00') return 'First Service';
  if (time === '13:00') return 'Second Service';
  if (time === '15:30') return 'Third Service';
  
  return null;
};

/**
 * Fetches bookings from Cal.com via backend proxy
 * @param {Date} startDate - Start date for bookings
 * @param {Date} endDate - End date for bookings
 * @returns {Promise<Array>} - Array of bookings
 */
export const fetchCalcomBookings = async (startDate, endDate) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/calcom/bookings`, {
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
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch Cal.com bookings');
    }

    const data = await response.json();
    
    // Return bookings array
    return data.bookings || [];
  } catch (error) {
    console.error('Error fetching Cal.com bookings:', error);
    throw error;
  }
};

/**
 * Helper: Lookup staff member by email from database
 * Returns staff profile info if found, null otherwise
 */
const lookupStaffByEmail = async (email) => {
  if (!email || email === 'info@nextgen-ccf.org') return null;
  
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('staff_id, first_name, last_name, role, profile_image_url, profile_image_path, phone_number')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .single();
    
    if (error || !data) return null;
    
    return {
      staffId: data.staff_id,
      fullName: `${data.first_name} ${data.last_name}`,
      firstName: data.first_name,
      lastName: data.last_name,
      role: data.role,
      profileImage: data.profile_image_url,
      profilePath: data.profile_image_path,
      phone: data.phone_number,
      isRegisteredStaff: true
    };
  } catch (error) {
    console.error('Error looking up staff:', error);
    return null;
  }
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
  
  // Convert identifier to string and use it to generate consistent gradient
  const identifierStr = String(identifier || 'default');
  const hash = identifierStr.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  
  const index = hash % colors.length;
  return colors[index];
};

/**
 * Transforms Cal.com bookings to app-friendly format
 * @param {Array} bookings - Raw bookings from Cal.com API
 * @returns {Array} - Transformed bookings with service information
 */
export const transformCalcomBookings = async (bookings) => {
  if (!Array.isArray(bookings)) {
    return [];
  }

  console.log('🔄 Transforming', bookings.length, 'Cal.com bookings...');
  if (bookings.length > 0) {
    console.log('📄 First booking structure:', JSON.stringify(bookings[0], null, 2));
  }

  const transformedBookings = await Promise.all(bookings.map(async (booking) => {
    // Parse start and end times in Philippine timezone (UTC+8)
    const startDate = new Date(booking.start);
    const endDate = new Date(booking.end);
    
    // Extract time in Philippine timezone
    const startTime = startDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Manila'
    });

    const endTime = endDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Manila'
    });

    // Map time to service
    const serviceName = mapTimeToService(startTime);
    
    // Extract volunteer info from attendees
    // If user is the organizer, get the attendee (not the organizer)
    const organizerEmail = booking.hosts?.[0]?.email;
    const attendee = booking.attendees?.find(att => att.email !== organizerEmail) || booking.attendees?.[0];
    const volunteerName = attendee?.name || 'Volunteer';
    const volunteerEmail = attendee?.email;
    const volunteerPhone = attendee?.phoneNumber;
    
    // Extract physical role from attendee's bookingFieldsResponses
    // Cal.com stores custom form fields inside each attendee object
    const physicalRole = attendee?.bookingFieldsResponses?.physical_role || 
                         attendee?.bookingFieldsResponses?.['What is your physical role?'] ||
                         'Volunteer';
    
    console.log('📋 Physical role for', volunteerName, ':', physicalRole);
    if (attendee?.bookingFieldsResponses) {
      console.log('📊 Available attendee fields:', Object.keys(attendee.bookingFieldsResponses));
    }
    
    // Lookup staff profile from database
    const staffProfile = await lookupStaffByEmail(volunteerEmail);
    
    // Generate profile data
    const profileData = staffProfile ? {
      // Use staff table data
      volunteerName: staffProfile.fullName,
      firstName: staffProfile.firstName,
      lastName: staffProfile.lastName,
      profileImage: staffProfile.profileImage,
      profilePath: staffProfile.profilePath,
      staffId: staffProfile.staffId,
      staffRole: staffProfile.role,
      phone: staffProfile.phone || volunteerPhone,
      isRegisteredStaff: true,
      profileGradient: getStaffGradient(staffProfile.staffId)
    } : {
      // Generate fallback profile
      volunteerName,
      firstName: volunteerName.split(' ')[0],
      lastName: volunteerName.split(' ').slice(1).join(' '),
      profileImage: null,
      profilePath: null,
      staffId: null,
      staffRole: null,
      phone: volunteerPhone,
      isRegisteredStaff: false,
      profileGradient: getStaffGradient(volunteerEmail)
    };

    return {
      id: booking.uid,
      title: booking.title || 'Volunteer Booking',
      description: booking.description || '',
      start: startDate,
      end: endDate,
      startTime,
      endTime,
      serviceName, // First Service, Second Service, or Third Service
      location: booking.location || '',
      status: booking.status || 'accepted',
      isAllDay: false,
      // Volunteer information (merged from Cal.com and staff table)
      ...profileData,
      volunteerEmail,
      physicalRole, // Physical role from Cal.com form
      role: physicalRole, // Alias for compatibility
      // Additional Cal.com specific data
      duration: booking.duration,
      meetingUrl: booking.meetingUrl,
      hosts: booking.hosts || [],
      // Store raw Cal.com data for debugging
      _rawCalcomData: {
        bookingFieldsResponses: booking.bookingFieldsResponses,
        metadata: booking.metadata
      }
    };
  }));
  
  // Filter out bookings without valid service mapping
  const filteredBookings = transformedBookings.filter(booking => {
    const hasValidService = booking.serviceName !== null;
    if (!hasValidService) {
      console.log('⚠️ Filtered out booking (no matching service):', booking.title, 'Time:', booking.startTime);
    }
    return hasValidService;
  });
  
  return filteredBookings;
};

/**
 * Gets bookings grouped by service for a specific date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Object>} - Bookings grouped by service name
 */
export const getBookingsByService = async (startDate, endDate) => {
  try {
    const rawBookings = await fetchCalcomBookings(startDate, endDate);
    const transformedBookings = await transformCalcomBookings(rawBookings);

    // Group by service
    const grouped = {
      'First Service': [],
      'Second Service': [],
      'Third Service': []
    };

    transformedBookings.forEach(booking => {
      if (booking.serviceName && grouped[booking.serviceName]) {
        grouped[booking.serviceName].push(booking);
      }
    });

    return grouped;
  } catch (error) {
    console.error('Error getting bookings by service:', error);
    throw error;
  }
};

/**
 * Gets all bookings for a specific week or date range
 * @param {Date} weekStart - Starting date
 * @param {Date} weekEnd - Optional ending date (defaults to 6 days after start)
 * @returns {Promise<Array>} - All bookings for the period
 */
export const getWeeklyBookings = async (weekStart, weekEnd = null) => {
  if (!weekEnd) {
    weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Saturday
  }

  try {
    const rawBookings = await fetchCalcomBookings(weekStart, weekEnd);
    console.log('📦 Raw bookings from Cal.com:', rawBookings.length);
    
    const transformedBookings = await transformCalcomBookings(rawBookings);
    console.log('✨ Transformed bookings:', transformedBookings.length);
    
    // Filter bookings to date range
    const filteredBookings = transformedBookings.filter(booking => {
      if (!booking.start) return false;
      const bookingDate = new Date(booking.start);
      return bookingDate >= weekStart && bookingDate <= weekEnd;
    });
    
    console.log('🔍 Filtered bookings in range:', filteredBookings.length, 
                `(${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()})`);
    
    if (filteredBookings.length > 0) {
      console.log('📅 Booking dates:', filteredBookings.map(b => 
        new Date(b.start).toLocaleDateString() + ' ' + b.startTime + ' - ' + b.volunteerName + ' (' + b.physicalRole + ')'
      ));
    }
    
    return filteredBookings;
  } catch (error) {
    console.error('Error getting weekly bookings:', error);
    throw error;
  }
};

/**
 * Export calendar data to formatted CSV with visual schedule layout
 * @param {Array} bookings - Bookings to export
 * @param {Date} monthDate - The month to generate schedule for
 * @returns {string} - CSV formatted string with visual schedule
 */
export const exportToFormattedCSV = (bookings, monthDate) => {
  if (!bookings || bookings.length === 0) {
    return 'No bookings to export';
  }

  const month = monthDate.getMonth();
  const year = monthDate.getFullYear();
  const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Role categories matching volunteer schedule needs
  const roleCategories = [
    'Team Leader',
    'Lead Teachers (5-8 Y.O.)',
    'Lead Teachers (9-11 Y.O.)',
    'Teachers (5-8 Y.O.)',
    'Teachers (9-11 Y.O.)',
    'Gate Keeper'
  ];

  // Get all Sundays in the month
  const sundays = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    if (date.getDay() === 0) { // Sunday
      sundays.push(new Date(date));
    }
    date.setDate(date.getDate() + 1);
  }

  // Build CSV content with visual layout
  const lines = [];
  
  // Title
  lines.push(`"NXTGen Volunteer Schedule - ${monthName}"`);
  lines.push('');
  
  // Header row with Service column
  const headerRow = ['Sunday Date', ...roleCategories, 'Service'];
  lines.push(headerRow.map(h => `"${h}"`).join(','));

  // For each Sunday, add rows for each service
  sundays.forEach(sunday => {
    const sundayStr = sunday.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const displayDate = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // Get bookings for this Sunday (excluding cancelled)
    const sundayBookings = bookings.filter(booking => {
      if (booking.status === 'cancelled') return false; // Skip cancelled
      const bookingDate = new Date(booking.start);
      const bookingDateStr = bookingDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      return bookingDateStr === sundayStr;
    });

    // Group by service
    const services = {
      'First Service': sundayBookings.filter(b => b.serviceName === 'First Service'),
      'Second Service': sundayBookings.filter(b => b.serviceName === 'Second Service'),
      'Third Service': sundayBookings.filter(b => b.serviceName === 'Third Service')
    };

    // Add row for each service
    ['First Service', 'Second Service', 'Third Service'].forEach((serviceName, idx) => {
      const serviceBookings = services[serviceName] || [];
      
      // Build row with date label on first service only
      const dateLabel = idx === 0 ? displayDate : '';
      const row = [dateLabel];
      
      // For each role category, find matching volunteers
      roleCategories.forEach(roleCategory => {
        const volunteers = serviceBookings
          .filter(booking => {
            const role = booking.physicalRole || booking.role || '';
            // Exact match for role keys
            return role === roleCategory;
          })
          .map(v => v.volunteerName)
          .join(', '); // Combine multiple volunteers with comma
        
        row.push(volunteers || '-');
      });
      
      // Add service label at the end
      row.push(serviceName);
      lines.push(row.map(cell => `"${cell}"`).join(','));
    });
    
    // Add blank line between Sundays
    lines.push('');
  });

  return lines.join('\n');
};

/**
 * Legacy export function for backward compatibility
 * @param {Array} bookings - Bookings to export
 * @returns {string} - CSV formatted string
 */
export const exportToCSV = (bookings) => {
  if (!bookings || bookings.length === 0) {
    return 'No bookings to export';
  }

  // CSV Headers
  const headers = ['Date', 'Service', 'Time', 'Volunteer Name', 'Email', 'Phone', 'Physical Role', 'Staff Role', 'Status'];
  
  // CSV Rows
  const rows = bookings.map(booking => {
    const date = booking.start ? new Date(booking.start).toLocaleDateString() : '';
    const time = `${booking.startTime || ''} - ${booking.endTime || ''}`;
    
    return [
      date,
      booking.serviceName || '',
      time,
      booking.volunteerName || '',
      booking.volunteerEmail || '',
      booking.phone || '',
      booking.physicalRole || '',
      booking.staffRole || '',
      booking.status || ''
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
};

/**
 * Triggers download of calendar data as formatted CSV file
 * @param {Array} bookings - Bookings to export
 * @param {Date} monthDate - The month to generate schedule for
 * @param {string} filename - Optional filename
 */
export const downloadCalendarCSV = (bookings, monthDate, filename = null) => {
  const csvContent = exportToFormattedCSV(bookings, monthDate);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  const defaultFilename = `volunteer-schedule-${monthDate.getFullYear()}-${(monthDate.getMonth() + 1).toString().padStart(2, '0')}.csv`;
  
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename || defaultFilename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Generates styled HTML for volunteer schedule table
 * @param {Array} bookings - Bookings to display
 * @param {Date} monthDate - The month to generate schedule for
 * @returns {string} - HTML string with inline styles
 */
const generateStyledScheduleHTML = (bookings, monthDate) => {
  const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  // Define roles
  const roles = [
    { key: 'Team Leader', label: 'Team Leaders' },
    { key: 'Lead Teachers (5-8 Y.O.)', label: 'Lead Teachers (5-8 Y.O.)' },
    { key: 'Lead Teachers (9-11 Y.O.)', label: 'Lead Teachers (9-11 Y.O.)' },
    { key: 'Teachers (5-8 Y.O.)', label: 'Teachers (5-8 Y.O.)' },
    { key: 'Teachers (9-11 Y.O.)', label: 'Teachers (9-11 Y.O.)' },
    { key: 'Gate Keeper', label: 'Gate Keepers' }
  ];

  // Group bookings by date and service
  const groupedByDate = {};
  bookings.forEach(booking => {
    // Skip cancelled bookings
    if (booking.status === 'cancelled' || booking.booking_status === 'cancelled') return;
    
    const bookingDate = new Date(booking.start);
    const dateStr = bookingDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    
    if (!groupedByDate[dateStr]) {
      groupedByDate[dateStr] = {};
    }
    
    const serviceName = booking.serviceName || 'Unknown';
    if (!groupedByDate[dateStr][serviceName]) {
      groupedByDate[dateStr][serviceName] = [];
    }
    
    groupedByDate[dateStr][serviceName].push(booking);
  });

  // Get all Sundays in the month
  const sundays = [];
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0) {
      sundays.push(new Date(d));
    }
  }

  // Generate HTML rows
  let tableRows = '';
  sundays.forEach((sunday, sundayIndex) => {
    const dateStr = sunday.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    const dateDisplay = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const servicesData = groupedByDate[dateStr] || {};
    
    // Service order
    const serviceOrder = ['First Service', 'Second Service', 'Third Service'];
    
    serviceOrder.forEach((serviceName, serviceIndex) => {
      const serviceBookings = servicesData[serviceName] || [];
      // Alternate between light shades using NXTGen colors
      const bgColor = sundayIndex % 2 === 0 ? '#f0f9ff' : '#e0f7fa';
      const borderBottom = serviceIndex === serviceOrder.length - 1 ? '2px solid #30cee4' : '1px solid #e5e7eb';
      
      let row = `<tr style="background-color: ${bgColor};">`;
      
      // Date column with rowspan for all 3 services
      if (serviceIndex === 0) {
        row += `<td rowspan="3" style="padding: 16px 12px; border-right: 2px solid #30cee4; border-bottom: ${borderBottom}; text-align: center; font-weight: 700; color: #1ca7bc; vertical-align: middle; font-size: 16px; min-width: 100px;">${dateDisplay}</td>`;
      }
      
      // Role columns
      roles.forEach((role, roleIndex) => {
        const volunteers = serviceBookings
          .filter(b => {
            const physicalRole = b.physicalRole || b.role || '';
            return physicalRole === role.key;
          })
          .map(v => v.volunteerName)
          .join(', ');
        
        const cellStyle = volunteers ? 'color: #1f2937; font-weight: 500;' : 'color: #9ca3af; font-style: italic;';
        const borderRight = roleIndex < roles.length - 1 ? '1px solid #e5e7eb' : '2px solid #30cee4';
        row += `<td style="padding: 12px; border-right: ${borderRight}; border-bottom: ${borderBottom}; ${cellStyle} min-width: 130px;">${volunteers || '-'}</td>`;
      });
      
      // Service column
      row += `<td style="padding: 12px; border-bottom: ${borderBottom}; text-align: center; font-weight: 600; color: #fb7610; font-size: 14px; min-width: 110px;">${serviceName}</td>`;
      
      row += `</tr>`;
      tableRows += row;
    });
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
          background: white;
          padding: 40px;
        }
        .container {
          max-width: 1800px;
          margin: 0 auto;
          background: white;
        }
        .header {
          background: linear-gradient(135deg, #30cee4 0%, #1ca7bc 100%);
          color: white;
          padding: 32px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .header h1 {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }
        .header h2 {
          font-size: 18px;
          font-weight: 500;
          opacity: 0.95;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        thead {
          background: linear-gradient(135deg, #fb7610 0%, #fc9544 100%);
          color: white;
        }
        th {
          padding: 16px 12px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-right: 1px solid rgba(255,255,255,0.2);
        }
        th:first-child {
          text-align: center;
          min-width: 100px;
        }
        th:last-child {
          border-right: none;
        }
        td {
          font-size: 13px;
          line-height: 1.4;
        }
        .footer {
          padding: 24px;
          text-align: center;
          background: #f9fafb;
          color: #6b7280;
          font-size: 12px;
          border-radius: 0 0 8px 8px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>NXTGen Ministry</h1>
          <h2>Volunteer Schedule - ${monthName}</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th style="text-align: center;">Sunday Date</th>
              <th>Team Leaders</th>
              <th>Lead Teachers 5-8 Y.O.</th>
              <th>Lead Teachers 9-11 Y.O.</th>
              <th>Teachers 5-8 Y.O</th>
              <th>Teachers 9-11 Y.O</th>
              <th>Gate Keepers</th>
              <th style="text-align: center;">Service</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="footer">
          Generated on ${new Date().toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </body>
    </html>
  `;
  
  return html;
};

/**
 * Export calendar as image (PNG)
 * Generates styled HTML table and captures it as an image
 * @param {Array} bookings - Bookings to export
 * @param {Date} monthDate - The month for filename
 */
export const exportCalendarAsImage = async (bookings, monthDate) => {
  try {
    // Dynamically import modern-screenshot
    const { domToPng } = await import('modern-screenshot');
    
    // Generate styled HTML
    const htmlContent = generateStyledScheduleHTML(bookings, monthDate);
    
    // Create temporary container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    document.body.appendChild(container);
    
    // Create a wrapper div for the HTML content
    const wrapper = document.createElement('div');
    wrapper.innerHTML = htmlContent;
    container.appendChild(wrapper);
    
    // Wait a bit for rendering
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Capture with modern-screenshot
    const dataUrl = await domToPng(wrapper, {
      scale: 2,
      backgroundColor: '#ffffff'
    });
    
    // Clean up
    document.body.removeChild(container);
    
    // Download the image
    const link = document.createElement('a');
    const filename = `volunteer-schedule-${monthDate.getFullYear()}-${(monthDate.getMonth() + 1).toString().padStart(2, '0')}.png`;
    link.download = filename;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Error exporting calendar as image:', error);
    
    // Clean up on error
    const container = document.querySelector('div[style*="-9999px"]');
    if (container) {
      document.body.removeChild(container);
    }
    
    throw new Error('Failed to export calendar as image. Please try again.');
  }
};

/**
 * Calculate staff statistics from Cal.com bookings
 * @param {string} staffEmail - Staff member's email address
 * @param {Array} allBookings - All Cal.com bookings (optional, will fetch if not provided)
 * @returns {Promise<Object>} - Statistics object with counts and recent assignment
 */
export const getStaffStatistics = async (staffEmail, allBookings = null) => {
  try {
    if (!staffEmail) {
      console.warn('⚠️ getStaffStatistics called without staffEmail');
      return {
        totalAssignments: 0,
        upcomingAssignments: 0,
        servicesWorked: 0,
        recentAssignment: null
      };
    }

    console.log('📊 Getting statistics for staff email:', staffEmail);

    // Fetch bookings if not provided (get last 6 months to current + 3 months ahead)
    let bookings = allBookings;
    if (!bookings) {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6);
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);
      
      // Check if we have valid cached data
      const now = Date.now();
      const cacheIsValid = bookingsCache.data && 
                          bookingsCache.timestamp && 
                          (now - bookingsCache.timestamp) < CACHE_DURATION &&
                          bookingsCache.startDate?.getTime() === startDate.getTime() &&
                          bookingsCache.endDate?.getTime() === endDate.getTime();
      
      if (cacheIsValid) {
        console.log('✨ Using cached bookings (age:', Math.round((now - bookingsCache.timestamp) / 1000), 'seconds)');
        bookings = bookingsCache.data;
      } else {
        console.log('📅 Fetching bookings from', startDate.toLocaleDateString(), 'to', endDate.toLocaleDateString());
        const rawBookings = await fetchCalcomBookings(startDate, endDate);
        bookings = await transformCalcomBookings(rawBookings);
        
        // Update cache
        bookingsCache = {
          data: bookings,
          timestamp: now,
          startDate: new Date(startDate),
          endDate: new Date(endDate)
        };
        
        console.log('📦 Total bookings fetched and cached:', bookings.length);
      }
    }

    // Debug: Show all volunteer emails in bookings
    if (bookings.length > 0) {
      console.log('📧 All volunteer emails in bookings:', bookings.map(b => b.volunteerEmail));
    }

    // Filter bookings for this staff member (case-insensitive email match)
    // Fixed: Use volunteerEmail instead of attendeeEmail
    const staffBookings = bookings.filter(booking => 
      booking.volunteerEmail && 
      booking.volunteerEmail.toLowerCase() === staffEmail.toLowerCase()
    );

    console.log('✅ Found', staffBookings.length, 'bookings for', staffEmail);

    if (staffBookings.length === 0) {
      console.log('ℹ️ No bookings found for this staff member');
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
    const totalAssignments = staffBookings.length;
    const upcomingAssignments = staffBookings.filter(b => new Date(b.start) >= todayStart).length;
    
    // Count services worked: All past bookings (before today)
    // This includes all completed services in the past
    const pastBookings = staffBookings.filter(b => new Date(b.start) < todayStart);
    const servicesWorked = pastBookings.length;
    
    console.log('📊 Breakdown:', {
      total: totalAssignments,
      past: pastBookings.length,
      upcoming: upcomingAssignments,
      pastDates: pastBookings.map(b => new Date(b.start).toLocaleDateString())
    });

    // Get most recent assignment (sorted by date descending)
    const sortedBookings = [...staffBookings].sort((a, b) => 
      new Date(b.start) - new Date(a.start)
    );
    
    const recentBooking = sortedBookings[0];
    const recentAssignment = recentBooking ? {
      assignment_date: recentBooking.start,
      role: recentBooking.physicalRole || 'volunteer',
      notes: recentBooking.description || null,
      services: {
        service_name: recentBooking.serviceName,
        day_of_week: new Date(recentBooking.start).toLocaleDateString('en-US', { weekday: 'long' }),
        start_time: new Date(recentBooking.start).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        })
      }
    } : null;

    console.log('📈 Statistics calculated:', {
      totalAssignments,
      upcomingAssignments,
      servicesWorked,
      recentAssignment: recentAssignment ? {
        date: recentAssignment.assignment_date,
        role: recentAssignment.role,
        service: recentAssignment.services.service_name
      } : null
    });

    return {
      totalAssignments,
      upcomingAssignments,
      servicesWorked,
      recentAssignment
    };
  } catch (error) {
    console.error('❌ Error calculating staff statistics:', error);
    return {
      totalAssignments: 0,
      upcomingAssignments: 0,
      servicesWorked: 0,
      recentAssignment: null
    };
  }
};

/**
 * Clear the bookings cache (useful after creating/updating bookings)
 */
export const clearBookingsCache = () => {
  bookingsCache = {
    data: null,
    timestamp: null,
    startDate: null,
    endDate: null
  };
  console.log('🗑️ Bookings cache cleared');
};

export default {
  fetchCalcomBookings,
  transformCalcomBookings,
  getBookingsByService,
  getWeeklyBookings,
  exportToCSV,
  exportToFormattedCSV,
  downloadCalendarCSV,
  exportCalendarAsImage,
  getStaffStatistics,
  clearBookingsCache
};
