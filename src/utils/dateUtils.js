/**
 * Get a formatted date string
 * @param {string|Date} date - The date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return '';
  
  const defaultOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  };
  
  return new Date(dateString).toLocaleDateString('en-US', defaultOptions);
};

/**
 * Format a time string (HH:MM:SS) to a more readable format
 * @param {string} timeString - Time string in HH:MM:SS format
 * @returns {string} Formatted time
 */
export const formatTime = (timeString) => {
  if (!timeString) return 'N/A';
  
  try {
    // Extract hours and minutes
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    console.error('Error formatting time:', e);
    return timeString;
  }
};

/**
 * Calculate age from birthdate
 * @param {string|Date} birthdate - Birthdate
 * @returns {number} Age in years
 */
export const calculateAge = (birthdate) => {
  if (!birthdate) return 'N/A';
  
  try {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  } catch (e) {
    console.error('Error calculating age:', e);
    return 'N/A';
  }
};

/**
 * Get current date in YYYY-MM-DD format
 * @returns {string} Current date in YYYY-MM-DD format
 */
export const getCurrentDate = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Get a date relative to current date
 * @param {number} days - Number of days to add (or subtract if negative)
 * @returns {string} Date in YYYY-MM-DD format
 */
export const getRelativeDate = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

/**
 * Get the date range for the current month
 * @returns {Object} Object with start and end dates of the month in YYYY-MM-DD format
 */
export const getMonthDateRange = () => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  return {
    start: startOfMonth.toISOString().split('T')[0],
    end: endOfMonth.toISOString().split('T')[0]
  };
};

/**
 * Get the date range for the current week
 * @returns {Object} Object with start and end dates of the week in YYYY-MM-DD format
 */
export const getWeekDateRange = () => {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Start on Sunday
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // End on Saturday
  
  return {
    start: startOfWeek.toISOString().split('T')[0],
    end: endOfWeek.toISOString().split('T')[0]
  };
};