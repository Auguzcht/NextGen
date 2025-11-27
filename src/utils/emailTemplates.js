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
 * Custom Email Template (for Email Composer)
 */
export const createCustomEmailTemplate = ({ subject, htmlContent, recipientName, materials = [] }) => {
  // Clean and extract content from potentially nested HTML
  let cleanContent = htmlContent || '';
  
  // If the content looks like a complete HTML document, extract just the body content
  if (cleanContent.includes('<!DOCTYPE html>') || cleanContent.includes('<html>')) {
    try {
      // Extract content between <body> tags or fallback to the original content
      const bodyMatch = cleanContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        // Extract just the inner content of the email body, avoiding nested templates
        let bodyContent = bodyMatch[1];
        
        // Look for the main content div and extract it (avoiding nested email templates)
        const contentMatch = bodyContent.match(/<div style="color: #4a5568[^>]*>([\s\S]*?)<\/div>/);
        if (contentMatch) {
          cleanContent = contentMatch[1].trim();
        } else {
          // If we can't find the specific content div, use a more general approach
          // Remove any nested email template structures
          bodyContent = bodyContent.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, '');
          bodyContent = bodyContent.replace(/<div[^>]*background[^>]*>[\s\S]*?<\/div>/gi, '');
          cleanContent = bodyContent.trim();
        }
      }
    } catch (error) {
      console.warn('Error parsing nested HTML content, using original:', error);
      // Fallback to original content if parsing fails
    }
  }
  
  // Generate materials HTML if any are provided
  const materialsHtml = materials && materials.length > 0 ? `
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
  ` : '';
  
  const content = `
    ${recipientName ? `<p style="color: #4a5568; line-height: 1.6; margin: 0 0 24px 0; font-size: 16px;">Hello ${recipientName}!</p>` : '<p style="color: #4a5568; line-height: 1.6; margin: 0 0 24px 0; font-size: 16px;">Hello!</p>'}
    
    <div style="color: #4a5568; line-height: 1.6; font-size: 16px;">
      ${cleanContent}
    </div>
    
    ${materialsHtml}
    
    <p style="color: #4a5568; line-height: 1.6; margin: 24px 0 0 0; font-size: 14px;">
      <strong>Questions?</strong> Feel free to contact us if you need any assistance or have questions about NXTGen Ministry programs.
    </p>
  `;
  
  return createEmailTemplate({
    title: subject,
    subtitle: subject.length > 50 ? subject.substring(0, 50) + '...' : subject,
    content,
    showUnsubscribe: true
  });
};