import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Email Service
 * Client-side service for interacting with email APIs
 */

/**
 * Get email configuration
 */
export const getEmailConfig = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/email/config`);
    return response.data;
  } catch (error) {
    console.error('Error fetching email config:', error);
    throw error;
  }
};

/**
 * Update email configuration
 */
export const updateEmailConfig = async (config) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/email/config`, config);
    return response.data;
  } catch (error) {
    console.error('Error updating email config:', error);
    throw error;
  }
};

/**
 * Send test email
 */
export const sendTestEmail = async (testEmail, config = null) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/email/send-test`, {
      testEmail,
      config
    });
    return response.data;
  } catch (error) {
    console.error('Error sending test email:', error);
    throw error;
  }
};

/**
 * Send batch emails
 */
export const sendBatchEmails = async (emailData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/email/send-batch`, emailData);
    return response.data;
  } catch (error) {
    console.error('Error sending batch emails:', error);
    throw error;
  }
};

/**
 * Send weekly report
 * @deprecated Use sendBatchEmails with staff recipients and weekly report template instead
 * This function is kept for backwards compatibility but should not be used in new code
 */
export const sendWeeklyReport = async (reportData, staffRecipients) => {
  try {
    // Redirect to batch email sending
    const { createStaffWeeklyReportTemplate } = await import('../utils/emailTemplates.js');
    
    const emailHtml = createStaffWeeklyReportTemplate({
      weekStartDate: reportData.week_start_date,
      weekEndDate: reportData.week_end_date,
      totalAttendance: reportData.total_attendance,
      uniqueChildren: reportData.unique_children,
      firstTimers: reportData.first_timers,
      reportPdfUrl: reportData.report_pdf_url
    });
    
    const subject = `Weekly Ministry Report: ${new Date(reportData.week_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(reportData.week_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    
    return await sendBatchEmails(
      staffRecipients,
      subject,
      emailHtml,
      null,
      null,
      'staff'
    );
  } catch (error) {
    console.error('Error sending weekly report:', error);
    throw error;
  }
};

/**
 * Get email logs with filters
 */
export const getEmailLogs = async (filters = {}) => {
  try {
    const params = new URLSearchParams(filters);
    const response = await axios.get(`${API_BASE_URL}/email/logs?${params}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching email logs:', error);
    throw error;
  }
};

/**
 * Get batch job details
 */
export const getBatchJobDetails = async (batchId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/email/batch/${batchId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching batch job details:', error);
    throw error;
  }
};

/**
 * Get email statistics
 */
export const getEmailStats = async (dateRange = {}) => {
  try {
    const params = new URLSearchParams(dateRange);
    const response = await axios.get(`${API_BASE_URL}/email/stats?${params}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching email stats:', error);
    throw error;
  }
};

/**
 * Validate email configuration
 */
export const validateEmailConfig = (config) => {
  const errors = [];

  if (!config.provider) {
    errors.push('Provider is required');
  }

  if (!config.api_key) {
    errors.push('API key is required');
  }

  if (!config.from_email) {
    errors.push('From email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.from_email)) {
    errors.push('Invalid from email format');
  }

  if (!config.from_name) {
    errors.push('From name is required');
  }

  if (config.batch_size && (config.batch_size < 1 || config.batch_size > 1000)) {
    errors.push('Batch size must be between 1 and 1000');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Format email recipients for batch sending
 */
export const formatRecipients = (guardians) => {
  return guardians
    .filter(g => g.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email))
    .map(g => ({
      email: g.email,
      name: `${g.first_name} ${g.last_name}`,
      guardianId: g.guardian_id
    }));
};

/**
 * Generate email preview HTML
 */
export const generateEmailPreview = (template, data = {}) => {
  let html = template.body || template.html;
  
  // Replace placeholders
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, data[key] || '');
  });
  
  return html;
};

/**
 * Send emails from EmailComposer
 */
export const sendComposerEmail = async (emailData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/email/send-composer`, emailData);
    return response.data;
  } catch (error) {
    console.error('Error sending composer emails:', error);
    throw error;
  }
};

/**
 * Send staff credentials emails
 */
export const sendStaffCredentials = async (staffMembers, eventType = 'new_account') => {
  try {
    const response = await axios.post(`${API_BASE_URL}/email/send-credentials`, {
      staffMembers,
      eventType
    });
    return response.data;
  } catch (error) {
    console.error('Error sending staff credentials:', error);
    throw error;
  }
};

export default {
  getEmailConfig,
  updateEmailConfig,
  sendTestEmail,
  sendBatchEmails,
  sendComposerEmail,
  sendWeeklyReport,
  getEmailLogs,
  getBatchJobDetails,
  getEmailStats,
  validateEmailConfig,
  formatRecipients,
  generateEmailPreview,
  sendStaffCredentials
};
