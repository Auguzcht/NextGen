/**
 * Get a formatted date string
 * @param {string|Date} date - The date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return 'N/A';
  
  const defaultOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  };

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', defaultOptions).format(d);
  } catch (e) {
    console.error('Error formatting date:', e);
    return String(date);
  }
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