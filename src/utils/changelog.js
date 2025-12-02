// NextGen Ministry Management System - Version Changelog
// This file tracks all version updates and changes for display in the application

export const CURRENT_VERSION = '1.10.0';

export const CHANGELOG = [
  {
    version: '1.10.0',
    date: '2025-12-03',
    title: 'Email System Overhaul & UI Improvements',
    type: 'major',
    changes: [
      {
        category: 'Email System',
        icon: '📧',
        updates: [
          'Completely rebuilt Email Composer with advanced template selection and preview system',
          'Fixed individual recipient personalization - emails now show "Dear [Name]," instead of generic "Hello!"',
          'Implemented dynamic greeting system with preset greetings for guardians, staff, both, and individual recipients',
          'Added materials browser integration allowing attachment of teaching resources to emails',
          'Enhanced email template processing with proper NXTGen branding detection and content wrapping',
          'Fixed double-wrapping issue where complete email templates were being wrapped in additional templates',
          'Implemented client-side vs server-side template processing differentiation',
          'Added {{name}} placeholder system for email provider personalization',
          'Fixed "Dear undefined undefined" recipient name parsing with comprehensive fallback logic',
          'Enhanced preview functionality to match actual sent email content',
          'Streamlined server-side processing to use pre-processed templates from client',
          'Removed debugging console logs for cleaner production code'
        ]
      },
      {
        category: 'User Interface',
        icon: '🎨',
        updates: [
          'Added comprehensive pagination to Email Logs Viewer with modern ellipsis design',
          'Implemented 15 items per page with full navigation controls (Previous/Next, page numbers)',
          'Enhanced email logs display with total count tracking and page indicators',
          'Added loading animations and smooth transitions for pagination',
          'Improved table performance by limiting results per page instead of loading all 200+ logs',
          'Enhanced email logs filtering with real-time search and pagination integration',
          'Added motion animations for page transitions in email logs table',
          'Updated pagination statistics showing "X to Y of Z results" format',
          'Improved responsive design for email logs pagination controls'
        ]
      },
      {
        category: 'Template Management',
        icon: '📝',
        updates: [
          'Enhanced createCustomEmailTemplate function with robust content detection',
          'Added intelligent NXTGen branding detection to prevent template conflicts',
          'Implemented proper HTML document extraction for complete email templates',
          'Fixed materials duplication prevention in email content',
          'Added support for complete email templates while maintaining proper wrapping',
          'Enhanced recipient type handling with individual vs group processing',
          'Improved template preview generation with proper recipient name handling',
          'Added comprehensive debug logging for template processing workflow (removed in production)'
        ]
      },
      {
        category: 'Performance & Reliability',
        icon: '⚡',
        updates: [
          'Optimized email logs loading with pagination instead of bulk loading',
          'Enhanced database queries with proper count and range operations',
          'Improved email sending reliability with proper template processing',
          'Reduced client-side processing by moving template logic to appropriate layers',
          'Enhanced error handling throughout email composition and sending pipeline',
          'Improved recipient data validation and name formatting consistency',
          'Optimized email provider integration with proper placeholder replacement',
          'Enhanced server response handling for both development and production environments'
        ]
      },
      {
        category: 'Developer Experience',
        icon: '💻',
        updates: [
          'Simplified development and production API endpoints by removing redundant template processing',
          'Enhanced debugging capabilities with comprehensive logging (development only)',
          'Improved code organization by centralizing template processing in client',
          'Added clear separation between client preview and server processing logic',
          'Enhanced error tracking throughout email composition workflow',
          'Cleaned up console output by removing production debugging statements',
          'Improved maintainability with better function separation and naming',
          'Added comprehensive inline documentation for email processing flow'
        ]
      },
      {
        category: 'Future Features Preview',
        icon: '🚀',
        updates: [
          'Foundation laid for upcoming Volunteer Assignment System integration',
          'Email infrastructure prepared for volunteer scheduling notifications',
          'Template system enhanced to support future volunteer-related email types',
          'Database structure considerations for volunteer management features',
          'UI patterns established for future volunteer assignment interfaces'
        ]
      }
    ]
  },
  {
    version: '1.0.6',
    date: '2025-11-24',
    title: 'Password Reset & Production Email Fix',
    type: 'patch',
    changes: [
      {
        category: 'Bug Fixes',
        icon: '🐛',
        updates: [
          'Fixed password reset flow - users now see reset form instead of auto-login',
          'Corrected PublicRoute logic to allow authenticated sessions on /reset-password page',
          'Added automatic sign-out after password reset to ensure new password must be used',
          'Fixed critical production API 500 errors - removed unused Resend import causing module resolution failure',
          'Corrected all API endpoints to use non-VITE prefixed environment variables in production',
          'Fixed Vercel serverless functions to use res.status().json() instead of object return format',
          'Added comprehensive logging to all API endpoints for better debugging',
          'Fixed redirect URLs to use correct production domain (www.nextgen-ccf.org)',
          'Resolved "Request failed with status code 500" and "hQ" error on production domain'
        ]
      },
      {
        category: 'Authentication',
        icon: '🔐',
        updates: [
          'Password reset links now properly display reset form instead of magic link behavior',
          'Users are automatically logged out after changing password',
          'Reset password page now correctly handles Supabase recovery tokens',
          'Improved session handling during password reset flow',
          'Enhanced token validation with better error messages'
        ]
      },
      {
        category: 'Email System',
        icon: '📧',
        updates: [
          'Fixed production email sending via Vercel serverless functions',
          'Corrected API response format for production deployment',
          'Updated all email API endpoints (send-credentials, send-test, send-batch, send-weekly-report, config)',
          'Improved CORS handling in production environment',
          'Enhanced error logging for email delivery failures',
          'Fixed environment variable access in Vercel deployment'
        ]
      },
      {
        category: 'Configuration',
        icon: '⚙️',
        updates: [
          'All API endpoints now use SUPABASE_URL instead of VITE_SUPABASE_URL in production',
          'All API endpoints now use SUPABASE_ANON_KEY instead of VITE_SUPABASE_ANON_KEY in production',
          'All API endpoints now use SUPABASE_SERVICE_KEY instead of VITE_SUPABASE_SERVICE_KEY in production',
          'Added fallback to VITE_ prefixed vars for local development compatibility',
          'Environment variables properly configured for both development and production'
        ]
      }
    ]
  },
  {
    version: '1.0.5',
    date: '2025-11-24',
    title: 'Production API Fix',
    type: 'patch',
    changes: [
      {
        category: 'Bug Fixes',
        icon: '🐛',
        updates: [
          'Fixed critical 500 error in production send-credentials API endpoint',
          'Corrected response format to use Vercel serverless function format (statusCode, headers, body)',
          'Added proper CORS headers and OPTIONS request handling for Vercel deployment',
          'Resolved "Error sending staff credentials: hQ" error in production environment',
          'Ensured API endpoint works consistently between development and production'
        ]
      },
      {
        category: 'Email System',
        icon: '📧',
        updates: [
          'Fixed send-credentials API to use proper Vercel serverless function return format',
          'Corrected API response structure for Vercel deployment requirements',
          'Enhanced error handling and response consistency across environments'
        ]
      }
    ]
  },
  {
    version: '1.0.4',
    date: '2025-11-16',
    title: 'Analytics & UX Improvements',
    type: 'minor',
    changes: [
      {
        category: 'Reports & Analytics',
        icon: '📊',
        updates: [
          'Fixed service comparison growth rate chart to display actual database percentages (e.g. 171.43%, 121.43%, -16.67%)',
          'Resolved growth trend analysis showing 0% instead of real growth data',
          'Enhanced time interval filters to dynamically influence all charts and reports',
          'Fixed analytics generation to preserve existing growth calculations',
          'Improved date range filtering across all report components'
        ]
      },
      {
        category: 'User Interface',
        icon: '🎨',
        updates: [
          'Updated pagination in ChildrenPage and GuardiansPage with modern ellipsis design',
          'Implemented shadcn-style pagination showing relevant pages with "..." for gaps',
          'Added arrow navigation icons for Previous/Next buttons',
          'Improved pagination performance by only rendering visible page numbers',
          'Enhanced user experience with consistent pagination across all data tables'
        ]
      },
      {
        category: 'Guardian Management',
        icon: '👨‍👩‍👧‍👦',
        updates: [
          'Added search functionality to AddGuardianForm for filtering associated children',
          'Implemented real-time search by child name or formal ID',
          'Enhanced children selection with intuitive search interface',
          'Improved usability for guardians with many associated children',
          'Added search icon and placeholder text for better UX',
          'Replaced table-based children list with modern flex layout matching SendCredentialsModal design',
          'Added height limitation and scrolling for better performance with large child lists'
        ]
      },
      {
        category: 'Data Quality',
        icon: '✨',
        updates: [
          'Added automatic name formatting to ensure proper capitalization in all forms',
          'Implemented formatName helper function for consistent name handling',
          'Names now automatically convert from "JOHN SMITH" to "John Smith" format',
          'Applied to both AddChildForm and AddGuardianForm for all name fields',
          'Handles child names, guardian names, and middle names consistently',
          'Formatting applied during form submission to maintain data integrity'
        ]
      },
      {
        category: 'System Improvements',
        icon: '⚙️',
        updates: [
          'Enhanced changelog system to display comprehensive patch history',
          'Improved version tracking with detailed change categorization',
          'Added timeline view for all system updates and improvements',
          'Better organization of feature updates and bug fixes',
          'Enhanced modal design for viewing historical changes'
        ]
      }
    ]
  },
  {
    version: '1.0.3',
    date: '2025-11-07',
    title: 'Initial Production Release',
    type: 'major',
    changes: [
      {
        category: 'Staff Management',
        icon: '👥',
        updates: [
          'Added comprehensive Send Access Emails modal with staff selection checklist',
          'Implemented multiple email event types (New Account, Password Reset, Account Reactivation, Access Reminder)',
          'Fixed button hover fade issue - now properly follows Button UI component styles',
          'Enhanced email templates with dynamic content based on event type',
          'Integrated email sending with database-driven configuration from email_api_config table',
          'Fixed API endpoint routing for local development with dev-server.cjs'
        ]
      },
      {
        category: 'Reports & Analytics',
        icon: '📊',
        updates: [
          'Migrated all report queries to use attendance_analytics table for improved performance',
          'Updated attendance graphs to fetch pre-calculated data instead of processing raw records',
          'Optimized growth trend analysis using analytics tables with monthly grouping',
          'Enhanced age distribution to use age count fields (age_4_5_count, age_6_7_count, etc.)',
          'Updated Weekly Reports PDF to include child formal_id in registrations table',
          'Removed redundant "Registered" column from PDF reports',
          'Improved table spacing and visual separation between sections',
          'Added proper empty state messages for tables with no data',
          'Enhanced PDF layout with consistent 10-15pt spacing between sections',
          'Reports now depend on generate_weekly_analytics() function for data population'
        ]
      },
      {
        category: 'System Features',
        icon: '⚙️',
        updates: [
          'Implemented version tracking and changelog system',
          'Added patch notes modal that displays only on actual login (not on page refresh)',
          'Version number now displayed in footer and clickable to view changelog',
          'Fixed changelog persistence - now uses sessionStorage with login timestamp tracking',
          'Distinguished between SIGNED_IN and INITIAL_SESSION auth events for proper display logic',
          'Improved user experience with detailed update notifications'
        ]
      },
      {
        category: 'Email System',
        icon: '📧',
        updates: [
          'Centralized email configuration using email_api_config database table',
          'All email features now fetch API keys and sender info from database',
          'Enhanced credential email system with Supabase-generated password reset links',
          'Support for multiple email event types with customized messaging',
          'Improved email templates with better formatting and branding',
          '24-hour expiring password setup links for security',
          'Fixed weekly report email sending to use proper API endpoint',
          'Added success rate tracking and detailed error reporting for batch emails',
          'Integrated Send Credentials with local dev server for development testing'
        ]
      },
      {
        category: 'Security & Performance',
        icon: '🔒',
        updates: [
          'Removed all console.log statements exposing Firebase Storage paths',
          'Eliminated debug logs revealing user data and schema information',
          'Optimized profile image loading - only fetch when profile_image_path exists',
          'Eliminated unnecessary 404 errors for users without profile images',
          'Database queries now use indexed analytics tables for faster performance',
          'Reduced JavaScript processing by leveraging SQL aggregations'
        ]
      },
      {
        category: 'UI/UX Improvements',
        icon: '🎨',
        updates: [
          'Modal components now follow consistent design patterns',
          'Improved button interactions and hover states',
          'Fixed modal scroll behavior - scrollbar now appears within modal, not on page',
          'Better visual feedback for user actions',
          'Enhanced accessibility across all forms and modals',
          'Removed distracting "no attendance" banner from reports page',
          'Cleaner, more professional empty states throughout the application'
        ]
      },
      {
        category: 'Developer Experience',
        icon: '💻',
        updates: [
          'Added /api/email/send-credentials endpoint to dev-server.cjs for local development',
          'Improved local API server with proper CORS and error handling',
          'Enhanced logging for email operations and API requests',
          'Better error messages to guide configuration and troubleshooting',
          'Consistent API response format across all email endpoints'
        ]
      },
      {
        category: 'Bug Fixes',
        icon: '🐛',
        updates: [
          'Fixed changelog showing on every page refresh instead of just login',
          'Fixed reports page showing zero data despite having registered children',
          'Fixed Send Credentials modal 404 error in local development',
          'Fixed weekly reports email not sending due to undefined API_URL',
          'Corrected auth event handling to distinguish login from session resume',
          'Fixed modal scrollbar appearing on body instead of modal content'
        ]
      }
    ]
  }
  // Future versions will be added above this comment
  // Example:
  // {
  //   version: '1.1.0',
  //   date: '2025-11-15',
  //   title: 'Enhanced Analytics',
  //   type: 'minor',
  //   changes: [...]
  // }
];

// Helper function to get latest version
export const getLatestVersion = () => CURRENT_VERSION;

// Helper function to get version changes
export const getVersionChanges = (version) => {
  return CHANGELOG.find(v => v.version === version);
};

// Helper function to get all versions
export const getAllVersions = () => CHANGELOG;

// Helper function to check if version is new compared to stored version
export const isNewVersion = (storedVersion) => {
  if (!storedVersion) return true;
  return CURRENT_VERSION !== storedVersion;
};

// Helper function to check if changelog should be shown for this session
export const shouldShowChangelog = (userId) => {
  if (!userId) return false;
  
  const sessionKey = `nextgen_changelog_shown_${userId}`;
  const loginTimestampKey = `nextgen_last_login_${userId}`;
  
  const shownTimestamp = sessionStorage.getItem(sessionKey);
  const loginTimestamp = sessionStorage.getItem(loginTimestampKey);
  
  // If no login timestamp exists, set it now (new login)
  if (!loginTimestamp) {
    sessionStorage.setItem(loginTimestampKey, Date.now().toString());
    return true; // Show on first login
  }
  
  // If shown timestamp doesn't exist or is older than login timestamp, show it
  if (!shownTimestamp || parseInt(shownTimestamp) < parseInt(loginTimestamp)) {
    return true;
  }
  
  return false;
};

// Helper function to mark changelog as shown for this session
export const markChangelogAsShown = (userId) => {
  if (!userId) return;
  
  const sessionKey = `nextgen_changelog_shown_${userId}`;
  sessionStorage.setItem(sessionKey, Date.now().toString());
};

// Helper function to mark a new login (call this when user logs in)
export const markNewLogin = (userId) => {
  if (!userId) return;
  
  const loginTimestampKey = `nextgen_last_login_${userId}`;
  sessionStorage.setItem(loginTimestampKey, Date.now().toString());
};

// Helper function to clear changelog session data (call on logout)
export const clearChangelogSession = (userId) => {
  if (!userId) return;
  
  const sessionKey = `nextgen_changelog_shown_${userId}`;
  const loginTimestampKey = `nextgen_last_login_${userId}`;
  
  sessionStorage.removeItem(sessionKey);
  sessionStorage.removeItem(loginTimestampKey);
};

// Helper function to get version statistics
export const getVersionStats = () => {
  const totalVersions = CHANGELOG.length;
  const totalUpdates = CHANGELOG.reduce((total, version) => {
    return total + version.changes.reduce((versionTotal, category) => {
      return versionTotal + category.updates.length;
    }, 0);
  }, 0);
  
  const typeCount = CHANGELOG.reduce((counts, version) => {
    counts[version.type] = (counts[version.type] || 0) + 1;
    return counts;
  }, {});

  return {
    totalVersions,
    totalUpdates,
    typeCount,
    latestVersion: CURRENT_VERSION,
    firstRelease: CHANGELOG[CHANGELOG.length - 1]?.date,
    latestRelease: CHANGELOG[0]?.date
  };
};

// Helper function to search changelog entries
export const searchChangelog = (query) => {
  if (!query) return CHANGELOG;
  
  const searchLower = query.toLowerCase();
  
  return CHANGELOG.filter(version => {
    // Search in version title
    if (version.title.toLowerCase().includes(searchLower)) return true;
    
    // Search in category names and updates
    return version.changes.some(category => {
      if (category.category.toLowerCase().includes(searchLower)) return true;
      return category.updates.some(update => 
        update.toLowerCase().includes(searchLower)
      );
    });
  });
};

// Helper function to get changes by category across all versions
export const getChangesByCategory = () => {
  const categories = {};
  
  CHANGELOG.forEach(version => {
    version.changes.forEach(change => {
      if (!categories[change.category]) {
        categories[change.category] = {
          icon: change.icon,
          totalUpdates: 0,
          versions: []
        };
      }
      
      categories[change.category].totalUpdates += change.updates.length;
      categories[change.category].versions.push({
        version: version.version,
        date: version.date,
        updates: change.updates
      });
    });
  });
  
  return categories;
};
