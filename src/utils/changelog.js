// NextGen Ministry Management System - Version Changelog
// This file tracks all version updates and changes for display in the application

export const CURRENT_VERSION = '1.0.4';

export const CHANGELOG = [
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
          'Added search icon and placeholder text for better UX'
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
