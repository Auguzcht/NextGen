/**
 * Validate an email address
 * @param {string} email - The email to validate
 * @returns {boolean} Whether the email is valid
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate a phone number (simple validation)
 * @param {string} phone - The phone number to validate
 * @returns {boolean} Whether the phone number is valid
 */
export const isValidPhone = (phone) => {
  if (!phone) return false;
  
  // Remove all non-digit characters
  const cleaned = ('' + phone).replace(/\D/g, '');
  
  // Most phone numbers should be 10-15 digits
  return cleaned.length >= 10 && cleaned.length <= 15;
};

/**
 * Check if a string is empty or only whitespace
 * @param {string} text - The text to check
 * @returns {boolean} Whether the text is empty
 */
export const isEmpty = (text) => {
  return !text || text.trim() === '';
};

/**
 * Validate a password (at least 8 chars, with one uppercase, one lowercase, one number)
 * @param {string} password - The password to validate
 * @returns {boolean} Whether the password is valid
 */
export const isStrongPassword = (password) => {
  if (!password) return false;
  
  const minLength = 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  return password.length >= minLength && hasUppercase && hasLowercase && hasNumber;
};

/**
 * Get validation errors for a form
 * @param {Object} data - The form data
 * @param {Object} rules - The validation rules
 * @returns {Object} Validation errors
 */
export const validateForm = (data, rules) => {
  const errors = {};
  
  for (const [field, fieldRules] of Object.entries(rules)) {
    for (const rule of fieldRules) {
      if (rule.type === 'required' && isEmpty(data[field])) {
        errors[field] = rule.message || `${field} is required`;
        break;
      }
      
      if (rule.type === 'email' && !isEmpty(data[field]) && !isValidEmail(data[field])) {
        errors[field] = rule.message || `${field} must be a valid email`;
        break;
      }
      
      if (rule.type === 'phone' && !isEmpty(data[field]) && !isValidPhone(data[field])) {
        errors[field] = rule.message || `${field} must be a valid phone number`;
        break;
      }
      
      if (rule.type === 'minLength' && data[field]?.length < rule.value) {
        errors[field] = rule.message || `${field} must be at least ${rule.value} characters`;
        break;
      }
      
      if (rule.type === 'matches' && data[field] !== data[rule.field]) {
        errors[field] = rule.message || `${field} must match ${rule.field}`;
        break;
      }
      
      if (rule.type === 'custom' && rule.test && !rule.test(data[field], data)) {
        errors[field] = rule.message || `${field} is invalid`;
        break;
      }
    }
  }
  
  return errors;
};