/**
 * NXTGen Ministry Davao Email Templates
 * Simplified HTML templates with clean branding and consistent design
 */

/**
 * NXTGen Ministry Color Palette
 */
export const NXTGEN_COLORS = {
  primary: '#30cee4',     // nxtgen-teal
  primaryDark: '#2ba5c7', // nxtgen-teal-dark
  success: '#28a745',
  warning: '#ffc107',
  danger: '#dc3545',
  gray: {
    50: '#f8f9fa',
    100: '#e9ecef',
    200: '#dee2e6',
    300: '#ced4da',
    400: '#adb5bd',
    500: '#6c757d',
    600: '#495057',
    700: '#343a40',
    800: '#212529',
    900: '#000000'
  }
};

/**
 * Base HTML template for all NXTGen Ministry Davao emails
 */
export const createEmailTemplate = ({
  title,
  subtitle = '',
  content,
  footerText = 'This is an automated message from NXTGen Ministry Management System.',
  showUnsubscribe = false,
  unsubscribeUrl = '',
  recipientEmail = ''
}) => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <!-- Logo Section -->
    <tr>
      <td align="center" style="padding: 20px 0;">
        <img src="https://lh3.googleusercontent.com/pw/AP1GczN9DAtMowQnXsni3sGqweHt-e3obunOQU6GYgHZerh4fMEvRp-7qgCqTp9FCLQZWDVP17LXvKKYExOhXTb-76zHgexV6Q_YhGt1qV3Ygm2cI3LZxJed62f8jJODVXg0HM9MOzjYmL2WSLGr1mKeCQ0w=w500-h500-s-no-gm?authuser=0" alt="NXTGen Ministry Davao" width="80" height="80" style="border: 0; outline: none;">
      </td>
    </tr>
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${NXTGEN_COLORS.primary} 0%, ${NXTGEN_COLORS.primaryDark} 100%); padding: 48px 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -0.02em;">NXTGen Ministry Davao</h1>
              ${subtitle ? `<p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0; font-size: 18px; font-weight: 400;">${subtitle}</p>` : ''}
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 16px; padding: 48px 32px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f7fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0;">
              <p style="color: #a0aec0; font-size: 12px; margin: 0; text-align: center; line-height: 1.5;">
                ${footerText}<br/>
                ${showUnsubscribe && unsubscribeUrl ? `<a href="${unsubscribeUrl}" style="color: ${NXTGEN_COLORS.primary};">Unsubscribe</a> | ` : ''}
                ${recipientEmail ? `This email was sent to ${recipientEmail}<br/>` : ''}
                Please do not reply to this email.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
    <!-- Social Media Links -->
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
          <tr>
            <td style="padding: 0 8px;">
              <a href="https://www.facebook.com/ccfnxtgen" style="text-decoration: none; opacity: 0.8; transition: opacity 0.3s ease;">
                <img src="https://lh3.googleusercontent.com/pw/AP1GczO1t-cigN2e2Zww4giWl61E_T81SWdAnYolOjYDGm9GXspVyXT0wsF5hrJPnQNfk8WyR3seXTmHDdvwtMenrUn8fG7FGaVs9ffAgx-DYMY6N2JryabAJqWL0_vTnADAnd3UzadOh-D3skOPdlnaiNdq=w24-h24-s-no-gm?authuser=0" alt="Facebook" width="24" height="24" style="border: 0; outline: none;">
              </a>
            </td>
            <td style="padding: 0 8px;">
              <a href="https://instagram.com/ccfnxtgen" style="text-decoration: none; opacity: 0.8; transition: opacity 0.3s ease;">
                <img src="https://lh3.googleusercontent.com/pw/AP1GczNLGbbdD3DJyeFsEtZGcHiiNB8veAS85_p1fS_mJNwmG19oTTZaZvPy2Rh6Ka1NedWBIyRs9y48sGFTdy5EZzuCpUbNoOh6WOzuCOpeN5g8GVmtHvCLvWodhWcUX-r7J6u4EASVmULN_VuUWQqZKKy_=w24-h24-s-no-gm?authuser=0" alt="Instagram" width="24" height="24" style="border: 0; outline: none;">
              </a>
            </td>
            <td style="padding: 0 8px;">
              <a href="https://youtube.com/@c%2Fccfnxtgen" style="text-decoration: none; opacity: 0.8; transition: opacity 0.3s ease;">
                <img src="https://lh3.googleusercontent.com/pw/AP1GczN8RozaSU3MeB0xTIfUC5zr1YPc4fRJb7BSUSY7OUdctFAcir_rZovmLR4Hz5JZjYiNDo8z3Kp1k599XqqR_gcyIr-nI9-1pl2wjdUiTeFGZJPWMT_MQXsMVXxFT65HJT0tBYm6XGEOUCnZG5cmHHG_=w24-h24-s-no-gm?authuser=0" alt="YouTube" width="24" height="24" style="border: 0; outline: none;">
              </a>
            </td>
            <td style="padding: 0 8px;">
              <a href="https://www.twitter.com/ccfnxtgen" style="text-decoration: none; opacity: 0.8; transition: opacity 0.3s ease;">
                <img src="https://lh3.googleusercontent.com/pw/AP1GczMzkqW76hwqz0_oPcFF07r8pPL1PypjAVLQskznU-TdEcSLwH37fAgSolHJ66YGuYBOrrrk-DUUbY09btdmNcsw0pcWEjDSCrJGonQELqpsLfqv0Y6D6UVtznXZoT2WKT_Y8SQ8omSfivB8kE57rwtp=w24-h24-s-no-gm?authuser=0" alt="Twitter/X" width="24" height="24" style="border: 0; outline: none;">
              </a>
            </td>
            <td style="padding: 0 8px;">
              <a href="https://github.com/sponsors/Auguzcht" style="text-decoration: none; opacity: 0.8; transition: opacity 0.3s ease;">
                <img src="https://lh3.googleusercontent.com/pw/AP1GczMZXiTwk5u4ZfCQYaQTpJTjDR8aWWz258iWl8yMhsGgNvQMPkadhXRPPAGFpx90NWTMQhI4FIDK3j2dF5R0Eb0irdA5045Bgoud8_WYw5iAmJ8Z7JRVhrXtndoP2BG--KuFZUUI6rvfMD3uIAfHx1u1=w24-h24-s-no-gm?authuser=0" alt="GitHub" width="24" height="24" style="border: 0; outline: none;">
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Test Email Template
 */
export const createTestEmailTemplate = () => {
  const content = `
    <h2 style="color: #1a202c; margin: 0 0 24px 0; font-size: 24px; font-weight: 600; letter-spacing: -0.01em;">Configuration Test Successful</h2>
    
    <p style="color: #4a5568; line-height: 1.6; margin: 0 0 24px 0; font-size: 16px;">
      Congratulations! Your NXTGen Ministry email configuration is working correctly.
    </p>
    
    <div style="background-color: #f0fff4; border-left: 4px solid ${NXTGEN_COLORS.success}; padding: 20px; margin: 24px 0; border-radius: 8px;">
      <p style="margin: 0; color: #2f855a; font-size: 14px;">
        <strong>Status:</strong> Active and Ready
      </p>
    </div>
    
    <p style="color: #4a5568; line-height: 1.6; margin: 0 0 16px 0; font-size: 16px;">
      Your email system is now ready to:
    </p>
    <ul style="color: #4a5568; margin: 0 0 24px 20px; font-size: 14px; line-height: 1.6;">
      <li style="margin-bottom: 8px;">Send Weekly Reports: Automated attendance summaries to guardians</li>
      <li style="margin-bottom: 8px;">Send Notifications: Event reminders and important announcements</li>
      <li style="margin-bottom: 8px;">Send Custom Messages: Personalized communications via Email Composer</li>
      <li>Send Staff Credentials: Account setup and password reset emails</li>
    </ul>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="#" style="display: inline-block; background-color: ${NXTGEN_COLORS.primary}; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; letter-spacing: -0.01em;">
        Access NXTGen Dashboard
      </a>
    </div>
    
    <p style="color: #666666; line-height: 1.6; margin: 20px 0 0 0; font-size: 14px;">
      If you have any questions or need assistance, please contact your system administrator.
    </p>
  `;
  
  return createEmailTemplate({
    title: 'Email Test Successful',
    subtitle: 'Your NXTGen Ministry email configuration is working perfectly!',
    content
  });
};

/**
 * Staff Credentials Email Template (for Supabase)
 */
export const createStaffCredentialsTemplate = (eventType = 'new_account') => {
  const eventConfigs = {
    new_account: {
      title: 'Welcome to NXTGen Ministry Davao',
      subtitle: 'Welcome to the Team!',
      heading: 'Your Account is Ready!',
      message: 'Welcome to the NXTGen Ministry Management System! Your account has been created and is ready to use.',
      buttonText: 'Access My Account',
      note: 'Click the button above to access your account and get started.'
    },
    password_reset: {
      title: 'Password Reset Request',
      subtitle: 'Reset Your Password',
      heading: 'Password Reset Requested',
      message: 'We received a request to reset your password for NXTGen Ministry Management System.',
      buttonText: 'Reset My Password',
      note: 'If you didn\'t request this, you can safely ignore this email.'
    },
    magic_link: {
      title: 'Sign in to NXTGen Ministry',
      subtitle: 'Secure Sign In',
      heading: 'Sign In to Your Account',
      message: 'Click the button below to securely sign in to NXTGen Ministry Management System.',
      buttonText: 'Sign In Now',
      note: 'This link is valid for 24 hours and can only be used once.'
    }
  };
  
  const config = eventConfigs[eventType] || eventConfigs.new_account;
  
  const content = `
    <h2 style="color: #1a202c; margin: 0 0 24px 0; font-size: 24px; font-weight: 600; letter-spacing: -0.01em;">${config.heading}</h2>
    
    <p style="color: #4a5568; line-height: 1.6; margin: 0 0 24px 0; font-size: 16px;">
      ${config.message}
    </p>
    
    <div style="background-color: #f7fafc; border-left: 4px solid ${NXTGEN_COLORS.primary}; padding: 20px; margin: 24px 0; border-radius: 8px;">
      <p style="margin: 0; color: #2d3748; font-size: 14px;"><strong>Email:</strong> {{ .Email }}</p>
    </div>
    
    <div style="background-color: #fffaf0; border-left: 4px solid ${NXTGEN_COLORS.warning}; padding: 20px; margin: 24px 0; border-radius: 8px;">
      <p style="margin: 0; color: #744210; font-size: 14px;">
        <strong>Action Required:</strong> ${config.note}
      </p>
    </div>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="display: inline-block; background-color: ${NXTGEN_COLORS.primary}; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; letter-spacing: -0.01em;">
        ${config.buttonText}
      </a>
    </div>
    
    <p style="color: #a0aec0; font-size: 12px; margin: 24px 0; text-align: center; line-height: 1.5;">
      This link will expire in 24 hours for security reasons.
    </p>
    
    <p style="color: #4a5568; line-height: 1.6; margin: 24px 0 0 0; font-size: 14px;">
      If you have any questions or need help, please contact your administrator.
    </p>
  `;
  
  return createEmailTemplate({
    title: config.title,
    subtitle: config.subtitle,
    content,
    recipientEmail: '{{ .Email }}'
  });
};

/**
 * Confirmation Email Template (for Supabase)
 */
export const createConfirmationEmailTemplate = () => {
  const content = `
    <h2 style="color: #1a202c; margin: 0 0 24px 0; font-size: 24px; font-weight: 600; letter-spacing: -0.01em;">Confirm Your Email Address</h2>
    
    <p style="color: #4a5568; line-height: 1.6; margin: 0 0 24px 0; font-size: 16px;">
      Thank you for signing up for NXTGen Ministry Management System. To complete your registration, 
      please confirm your email address by clicking the button below.
    </p>
    
    <div style="background-color: #f7fafc; border-left: 4px solid ${NXTGEN_COLORS.primary}; padding: 20px; margin: 24px 0; border-radius: 8px;">
      <p style="margin: 0; color: #2d3748; font-size: 14px;"><strong>Email:</strong> {{ .Email }}</p>
    </div>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="display: inline-block; background-color: ${NXTGEN_COLORS.primary}; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; letter-spacing: -0.01em;">
        Confirm Email Address
      </a>
    </div>
    
    <div style="background-color: #fffaf0; border-left: 4px solid ${NXTGEN_COLORS.warning}; padding: 20px; margin: 24px 0; border-radius: 8px;">
      <p style="margin: 0; color: #744210; font-size: 14px;">
        <strong>Security:</strong> This confirmation link is valid for 24 hours and can only be used once.
      </p>
    </div>
    
    <p style="color: #4a5568; line-height: 1.6; margin: 24px 0 0 0; font-size: 14px;">
      If you didn't create an account with us, you can safely ignore this email.
    </p>
  `;
  
  return createEmailTemplate({
    title: 'Confirm Your Email Address',
    subtitle: 'Please confirm your email to complete registration',
    content,
    recipientEmail: '{{ .Email }}'
  });
};

/**
 * Weekly Report Email Template for Staff (Coordinators, Admin, Team Leaders)
 */
export const createStaffWeeklyReportTemplate = ({
  weekStartDate,
  weekEndDate,
  totalAttendance,
  uniqueChildren,
  firstTimers,
  reportPdfUrl
}) => {
  const content = `
    <h2 style="color: #1a202c; margin: 0 0 24px 0; font-size: 24px; font-weight: 600; letter-spacing: -0.01em;">Weekly Ministry Report</h2>
    
    <p style="color: #4a5568; line-height: 1.6; margin: 0 0 24px 0; font-size: 16px;">
      Here's your weekly attendance and ministry summary for ${formatDate(new Date(weekStartDate), { month: 'long', day: 'numeric' })} - ${formatDate(new Date(weekEndDate), { month: 'long', day: 'numeric', year: 'numeric' })}.
    </p>
    
    <div style="background: linear-gradient(135deg, ${NXTGEN_COLORS.primary} 0%, ${NXTGEN_COLORS.primaryDark} 100%); border-radius: 12px; padding: 32px; margin: 24px 0;">
      <h3 style="color: #ffffff; margin: 0 0 24px 0; font-size: 18px; font-weight: 600;">Week at a Glance</h3>
      <table cellpadding="0" cellspacing="0" style="width: 100%;">
        <tr>
          <td style="padding: 12px 0;">
            <div style="color: rgba(255,255,255,0.9); font-size: 14px; margin-bottom: 4px;">Total Attendance</div>
            <div style="color: #ffffff; font-size: 32px; font-weight: 700;">${totalAttendance}</div>
          </td>
          <td style="padding: 12px 0;">
            <div style="color: rgba(255,255,255,0.9); font-size: 14px; margin-bottom: 4px;">Unique Children</div>
            <div style="color: #ffffff; font-size: 32px; font-weight: 700;">${uniqueChildren}</div>
          </td>
          <td style="padding: 12px 0;">
            <div style="color: rgba(255,255,255,0.9); font-size: 14px; margin-bottom: 4px;">First-Timers</div>
            <div style="color: #ffffff; font-size: 32px; font-weight: 700;">${firstTimers}</div>
          </td>
        </tr>
      </table>
    </div>
    
    ${reportPdfUrl ? `
    <div style="background-color: #f0fff4; border-left: 4px solid ${NXTGEN_COLORS.success}; padding: 20px; margin: 24px 0; border-radius: 8px;">
      <p style="margin: 0 0 16px 0; color: #2f855a; font-size: 14px;">
        <strong>📄 Full Report Available</strong>
      </p>
      <p style="margin: 0; color: #4a5568; font-size: 14px;">
        Click the button below to view the complete detailed report with charts and analytics.
      </p>
    </div>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${reportPdfUrl}" 
         style="display: inline-block; background-color: ${NXTGEN_COLORS.primary}; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; letter-spacing: -0.01em;">
        View Full Report (PDF)
      </a>
    </div>
    ` : ''}
    
    <p style="color: #4a5568; line-height: 1.6; margin: 24px 0 0 0; font-size: 14px;">
      Thank you for your dedication to NXTGen Ministry. Your service makes a difference in the lives of these children!
    </p>
  `;
  
  return createEmailTemplate({
    title: 'Weekly Ministry Report',
    subtitle: `${formatDate(new Date(weekStartDate), { month: 'short', day: 'numeric' })} - ${formatDate(new Date(weekEndDate), { month: 'short', day: 'numeric', year: 'numeric' })}`,
    content
  });
};

// Helper function for date formatting in email templates
const formatDate = (date, options = {}) => {
  const defaults = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(date).toLocaleDateString('en-US', { ...defaults, ...options });
};

/**
 * Weekly Report Email Template
 */
export const createWeeklyReportTemplate = (reportData) => {
  const content = `
    <h2 style="color: #1a202c; margin: 0 0 24px 0; font-size: 24px; font-weight: 600; letter-spacing: -0.01em;">Weekly Attendance Report</h2>
    
    <p style="color: #4a5568; line-height: 1.6; margin: 0 0 24px 0; font-size: 16px;">
      Hello ${reportData.guardianName || 'Guardian'}!
    </p>
    
    <p style="color: #4a5568; line-height: 1.6; margin: 0 0 24px 0; font-size: 16px;">
      Here's your child's attendance summary for the week of 
      ${reportData.weekStart} to ${reportData.weekEnd}.
    </p>
    
    ${reportData.children && reportData.children.length > 0 ? reportData.children.map(child => `
      <div style="background-color: #f7fafc; border-left: 4px solid ${NXTGEN_COLORS.primary}; padding: 24px; margin: 24px 0; border-radius: 8px;">
        <h3 style="color: #1a202c; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">${child.name}</h3>
        <p style="margin: 0 0 16px 0; color: #4a5568; font-size: 14px;"><strong>Age Group:</strong> ${child.ageGroup}</p>
        <p style="margin: 0 0 12px 0; color: #4a5568; font-size: 14px;"><strong>This Week's Attendance:</strong></p>
        <ul style="margin: 0 0 16px 20px; color: #4a5568; font-size: 14px; line-height: 1.5;">
          ${child.attendance.map(day => `<li style="margin-bottom: 4px;">${day.service} - ${day.status}</li>`).join('')}
        </ul>
        ${child.notes ? `<p style="margin: 0; color: #4a5568; font-size: 14px;"><strong>Notes:</strong> ${child.notes}</p>` : ''}
      </div>
    `).join('') : ''}
    
    <div style="background-color: #e6fffa; border-left: 4px solid ${NXTGEN_COLORS.primary}; padding: 20px; margin: 24px 0; border-radius: 8px;">
      <h3 style="color: #234e52; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Contact Information</h3>
      <p style="margin: 0; color: #285e61; font-size: 14px; line-height: 1.5;">
        If you have any questions about your child's participation, 
        please don't hesitate to reach out to our children's ministry team.
      </p>
    </div>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="#" style="display: inline-block; background-color: ${NXTGEN_COLORS.primary}; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; letter-spacing: -0.01em;">
        View Full Report Online
      </a>
    </div>
  `;
  
  return createEmailTemplate({
    title: 'Weekly Attendance Report',
    subtitle: `${reportData.guardianName}'s weekly attendance summary is ready`,
    content
  });
};

/**
 * Get appropriate greeting based on recipient type
 */
export const getGreetingForRecipientType = (recipientType, recipientName = null, recipientCount = 1) => {
  console.log('🎯 getGreetingForRecipientType called with:', { recipientType, recipientName, recipientCount });
  
  switch (recipientType) {
    case 'guardians':
      return 'Dear Parents,';
    case 'staff':
      return 'Dear Team,';
    case 'both':
      return 'Dear NXTGen Ministry Family,';
    case 'individual':
      if (!recipientName || recipientName === 'null' || recipientName === 'undefined' || recipientName.includes('undefined')) {
        console.log('⚠️ Invalid recipientName for individual, using general greeting instead of Hello');
        return 'Dear Valued Member,';
      }
      // Handle placeholder for email provider personalization
      if (recipientName === '{{name}}') {
        console.log('🏷️ Using placeholder for email provider personalization');
        return 'Dear {{name}},';
      }
      // If multiple individual recipients, use general greeting
      if (recipientCount > 1) return 'To Whom It May Concern,';
      const greeting = `Dear ${recipientName},`;
      console.log('✅ Generated individual greeting:', greeting);
      return greeting;
    default:
      return 'Hello!';
  }
};

/**
 * Child QR Code Email Template
 * Sends the child's QR code to their guardian for easy check-in
 */
export const createChildQREmailTemplate = ({
  childFirstName,
  childLastName,
  childFormalId,
  guardianName,
  qrCodeImageUrl // Hosted image URL (Firebase Storage)
}) => {
  const content = `
    <h2 style="color: #1a202c; margin: 0 0 24px 0; font-size: 24px; font-weight: 600; letter-spacing: -0.01em;">
      ${childFirstName}'s Check-In QR Code
    </h2>
    
    <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
      Hello${guardianName ? ` ${guardianName}` : ''},
    </p>
    
    <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
      Thank you for registering <strong>${childFirstName} ${childLastName}</strong> with NextGen Ministry! 
      We're excited to have your child join us.
    </p>
    
    <div style="background: linear-gradient(135deg, ${NXTGEN_COLORS.primary} 0%, #2ba5c7 100%); border-radius: 16px; padding: 40px; text-align: center; margin: 32px 0; box-shadow: 0 8px 20px rgba(48, 206, 228, 0.25);">
      <p style="color: #ffffff; font-size: 16px; font-weight: 700; margin: 0 0 24px 0; text-transform: uppercase; letter-spacing: 0.1em;">
        ✨ Your Check-In QR Code ✨
      </p>
      
      <div style="background: white; display: inline-block; padding: 32px; border-radius: 16px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15); margin-bottom: 24px;">
        ${qrCodeImageUrl ? `<img src="${qrCodeImageUrl}" alt="${childFirstName}'s QR Code" style="width: 300px; height: 300px; display: block;" />` : '<div style="width: 300px; height: 300px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; border-radius: 8px;">QR Code</div>'}
      </div>
      
      <div style="background: rgba(255, 255, 255, 0.95); border-radius: 12px; padding: 20px; margin: 0 auto; max-width: 400px;">
        <p style="color: ${NXTGEN_COLORS.primary}; font-size: 14px; font-weight: 600; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.05em;">
          Child ID
        </p>
        <p style="color: #1a202c; font-size: 28px; font-weight: 700; margin: 0 0 12px 0; letter-spacing: 0.02em; font-family: 'Courier New', monospace;">
          ${childFormalId}
        </p>
        <p style="color: #64748b; font-size: 14px; margin: 0; line-height: 1.5;">
          💾 Download the attachment below<br/>
          📱 Show it on your phone during check-in
        </p>
      </div>
    </div>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 24px 0;">
      <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
        <strong style="display: block; margin-bottom: 8px;">📱 Quick Check-In Tips:</strong>
        • Download the attached QR code image<br/>
        • Save it to your phone or print it out<br/>
        • Show the QR code to our staff during check-in<br/>
        • You can also use the Child ID (${childFormalId}) for check-in
      </p>
    </div>
    
    <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 24px 0 0 0;">
      If you have any questions or need assistance, please don't hesitate to contact our NextGen Ministry team.
    </p>
    
    <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 16px 0 0 0;">
      Blessings,<br/>
      <strong style="color: ${NXTGEN_COLORS.primary};">NextGen Ministry Davao Team</strong>
    </p>
  `;

  return createEmailTemplate({
    title: 'Welcome to NextGen Ministry!',
    subtitle: `${childFirstName}'s Registration Confirmation`,
    content,
    footerText: 'This is an automated message from NextGen Ministry Management System.',
    recipientEmail: ''
  });
};

/**
 * Custom Email Template (for Email Composer)
 */
export const createCustomEmailTemplate = ({ 
  subject, 
  htmlContent, 
  recipientName, 
  materials = [], 
  recipientType = 'guardians' 
}) => {
  // Use the original HTML content as-is (no complex extraction)
  let bodyContent = htmlContent || '';
  
  // Check if the content is a complete HTML document that needs body extraction
  const isFullHtmlDoc = bodyContent.toLowerCase().includes('<!doctype html>') || 
                        bodyContent.toLowerCase().includes('<html>');
  
  // Check if content already contains NXTGen branding (complete template)
  // Look for multiple indicators to identify complete templates
  const contentLower = bodyContent.toLowerCase();
  const hasNXTGenBranding = contentLower.includes('nxtgen ministry davao') ||
                           contentLower.includes('this is an automated message from nxtgen') ||
                           (contentLower.includes('<!doctype html>') && contentLower.includes('nxtgen')) ||
                           (contentLower.includes('<html>') && contentLower.includes('nxtgen')) ||
                           contentLower.includes('facebook\tinstagram\tyoutube') ||
                           contentLower.includes('resources for you');
  
  if (hasNXTGenBranding) {
    console.log('📧 Content already contains NXTGen branding - treating as simple content for proper wrapping');
    // Don't return early - let it fall through to be wrapped in NXTGen template
  }
  
  // If it's a complete HTML document, extract just the body content
  if (isFullHtmlDoc) {
    console.log('📧 Extracting body content from complete HTML template');
    
    // Extract content between <body> tags, excluding the body tag itself
    const bodyMatch = bodyContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch && bodyMatch[1]) {
      // Get the inner content of the body tag
      let extractedContent = bodyMatch[1].trim();
      
      // Remove any outer table wrappers to get just the content
      // Look for the main content inside table cells
      const tableContentMatch = extractedContent.match(/<td[^>]*style="[^"]*padding[^"]*"[^>]*>([\s\S]*?)<\/td>/i);
      if (tableContentMatch && tableContentMatch[1]) {
        bodyContent = tableContentMatch[1].trim();
        console.log('✅ Extracted table cell content successfully');
      } else {
        bodyContent = extractedContent;
        console.log('✅ Using full body content');
      }
    } else {
      console.log('❌ Could not extract body content, using original');
    }
  }
  
  // For simple content, wrap it in the template
  console.log('📝 Processing simple content - applying NXTGen template');
  
  // Generate preset greeting based on recipient type
  // For individual type, determine if we have multiple recipients
  const recipientCount = recipientType === 'individual' && recipientName && recipientName.includes('Multiple Recipients') ? 2 : 1;
  const greeting = getGreetingForRecipientType(recipientType, recipientName, recipientCount);
  
  // Check if "Questions?" section already exists to prevent duplication
  const hasQuestionsSection = bodyContent.toLowerCase().includes('questions?') ||
                             bodyContent.toLowerCase().includes('feel free to contact');

  // Generate materials HTML if any are provided and not already in content
  let materialsHtml = '';
  if (materials && materials.length > 0) {
    console.log('🔍 Materials received:', { 
      materialsCount: materials.length, 
      materialTitles: materials.map(m => m.title),
      recipientType 
    });
    
    const contentToCheck = bodyContent.toLowerCase();
    const hasExistingMaterials = (
      contentToCheck.includes('resources for you') && 
      (contentToCheck.includes('<h3') || contentToCheck.includes('<h2'))
    ) || contentToCheck.includes('we\'ve attached some helpful materials');
    
    console.log('🔍 Materials content check:', { 
      hasExistingMaterials,
      contentSnippet: contentToCheck.substring(0, 100)
    });
    
    if (!hasExistingMaterials) {
      console.log('📎 Adding materials section');
      materialsHtml = `
        <div style="background-color: #e6fffa; border-left: 4px solid ${NXTGEN_COLORS.primary}; padding: 20px; margin: 24px 0; border-radius: 8px;">
          <h3 style="margin: 0 0 16px 0; color: #285e61; font-size: 18px; font-weight: 600;">Resources for You</h3>
          <p style="margin: 0 0 12px 0; color: #285e61; font-size: 14px; line-height: 1.5;">
            We've attached some helpful materials for your child's ministry journey:
          </p>
          <ul style="margin: 0; padding-left: 20px; color: #285e61; font-size: 14px; line-height: 1.5;">
            ${materials.map(material => `
              <li style="margin-bottom: 12px;">
                <a href="${material.file_url || '#'}" style="color: #1a73e8; text-decoration: none; font-weight: 600;" target="_blank">
                  ${material.title}
                </a>${material.category ? ` (${material.category})` : ''}
                ${material.age_categories?.category_name ? `<br><small style="color: #4a7c59; font-size: 12px;">Age Group: ${material.age_categories.category_name}</small>` : ''}
              </li>
            `).join('')}
          </ul>
        </div>
      `;
      console.log('✅ Materials HTML generated, length:', materialsHtml.length);
    } else {
      console.log('⚠️ Materials section already exists in content, skipping');
    }
  } else {
    console.log('ℹ️ No materials provided or empty array');
  }

  const content = `
    <p style="color: #4a5568; line-height: 1.6; margin: 0 0 24px 0; font-size: 16px;">${greeting}</p>
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 24px 0; color: #4a5568; line-height: 1.6; font-size: 16px;">
      ${bodyContent}
    </div>
    
    ${materialsHtml}
    
    ${!hasQuestionsSection ? `<p style="color: #4a5568; line-height: 1.6; margin: 24px 0 0 0; font-size: 14px;">
      <strong>Questions?</strong> Feel free to contact us if you need any assistance or have questions about NXTGen Ministry programs.
    </p>` : ''}
  `;
  
  console.log('📧 Final template content includes materials:', content.includes('Resources for You'));
  
  return createEmailTemplate({
    title: subject,
    subtitle: subject.length > 50 ? subject.substring(0, 50) + '...' : subject,
    content,
    showUnsubscribe: true
  });
};