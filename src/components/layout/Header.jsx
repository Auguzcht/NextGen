import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../../services/firebase';
import NotificationDropdown from './NotificationDropdown';
import ProfileSettingsModal from './ProfileSettingsModal';

// Define logo path directly from public folder
const NextGenLogo = '/NextGen-Logo.png';
const NextGenLogoSvg = '/NextGen-Logo.svg';

// Page title mapping for NextGen
const pageTitles = {
  '/dashboard': { 
    title: 'Dashboard', 
    description: 'Overview of attendance and key metrics'
  },
  '/children': { 
    title: 'Children', 
    description: 'Manage child profiles and information'
  },
  '/attendance': { 
    title: 'Attendance', 
    description: 'Track and manage attendance records'
  },
  '/guardians': { 
    title: 'Guardians', 
    description: 'Manage guardian information and relationships'
  },
  '/reports': { 
    title: 'Reports', 
    description: 'View attendance analytics and reports'
  },
  '/settings': { 
    title: 'Settings', 
    description: 'Configure your system preferences'
  },
  '/staff': { 
    title: 'Staff', 
    description: 'Manage staff members and permissions'
  }
};

const Header = () => {
  const { user, logout } = useAuth();
  const { toggleSidebar, sidebarOpen } = useNavigation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Enhanced profile image fetch from Firebase Storage
  useEffect(() => {
    const fetchProfileImage = async () => {
      if (!user?.staff_id && !user?.uid) {
        setImageLoading(false);
        return;
      }

      // Check if image URL hasn't changed - avoid unnecessary loading state
      if (user.profile_image_url && profileImageUrl === user.profile_image_url) {
        return; // Already have the correct image, no need to reload
      }

      // Only show loading if we're actually changing something
      const needsUpdate = user.profile_image_url !== profileImageUrl;
      if (needsUpdate) {
        setImageLoading(true);
      }
      
      try {
        // Priority 1: Check if user object already has profile_image_url from database
        if (user.profile_image_url) {
          setProfileImageUrl(user.profile_image_url);
          setImageLoading(false);
          return;
        }

        // Priority 2: Only try Firebase Storage if profile_image_path exists
        // This prevents unnecessary 404 requests when user has no profile image
        if (user.profile_image_path) {
          try {
            const storageRef = ref(storage, user.profile_image_path);
            const url = await getDownloadURL(storageRef);
            
            if (url) {
              setProfileImageUrl(url);
              setImageLoading(false);
              return;
            }
          } catch (error) {
            // Silently handle - image doesn't exist, will use fallback
          }
        }

        // No profile image found - use fallback gradient
        setProfileImageUrl(null);
      } catch (error) {
        // Silently handle error
        setProfileImageUrl(null);
      } finally {
        setImageLoading(false);
      }
    };

    fetchProfileImage();
  }, [user?.staff_id, user?.profile_image_url, user?.profile_image_path, profileImageUrl]);

  // Get current page title and description
  const currentPath = location.pathname;
  const pathParts = currentPath.split('/');
  const mainPath = '/' + (pathParts.length > 1 ? pathParts[1] : '');
  
  // Get base page info with personalization for dashboard
  const basePageInfo = pageTitles[mainPath] || { 
    title: 'Dashboard', 
    description: 'Welcome to NextGen Ministry'
  };
  
  // Create personalized page info with user's name
  const pageInfo = useMemo(() => {
    const info = { ...basePageInfo };
    
    if (user && info.description.includes('Welcome')) {
      info.description = `Welcome to NextGen Ministry, ${user.first_name || user.email?.split('@')[0]}`;
    }
    
    return info;
  }, [basePageInfo, user]);

  // Generate consistent random gradient for user avatar fallback
  const userGradient = useMemo(() => {
    if (!user) return 'bg-gradient-to-br from-nextgen-blue-dark to-nextgen-orange-dark';
    
    const seed = user.uid || 'default';
    const colors = [
      'from-nextgen-blue to-nextgen-blue-dark',
      'from-nextgen-orange to-nextgen-orange-dark',
      'from-nextgen-blue-light to-nextgen-blue',
      'from-nextgen-orange-light to-nextgen-orange',
      'from-nextgen-blue-dark to-nextgen-orange-dark',
      'from-nextgen-blue to-nextgen-orange',
      'from-blue-500 to-indigo-600',
      'from-orange-500 to-amber-500'
    ];
    
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash % colors.length);
    return `bg-gradient-to-br ${colors[index]}`;
  }, [user]);

  // Handle scroll effect for dynamic header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const toggleUserMenu = () => {
    if (showNotifications) setShowNotifications(false);
    setShowUserMenu(!showUserMenu);
  };

  const toggleNotifications = () => {
    if (showUserMenu) setShowUserMenu(false);
    setShowNotifications(!showNotifications);
  };
  
  // Format current time
  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  // Format current date
  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  // Handle logout - update to use logout from context
  const handleLogout = async () => {
    try {
      await logout(); // Use logout instead of signOut
      // No need for navigate - logout will redirect to login page
    } catch (error) {
      // Silently handle logout errors
    }
  };

  // Enhanced avatar rendering function with loading state
  const renderAvatar = () => {
    if (imageLoading) {
      return (
        <div className={`h-full w-full rounded-full flex items-center justify-center ${userGradient} animate-pulse`}>
          <span className="font-medium text-sm text-white/50">
            {user?.first_name?.charAt(0) || user?.email?.charAt(0) || '?'}
            {user?.last_name?.charAt(0) || ''}
          </span>
        </div>
      );
    }

    if (profileImageUrl) {
      return (
        <img 
          src={profileImageUrl} 
          alt={`${user?.first_name || ''} ${user?.last_name || ''}`}
          className="h-full w-full object-cover"
          onError={(e) => {
            e.target.onerror = null; // Prevent infinite loop
            setProfileImageUrl(null); // Fall back to gradient
            setImageLoading(false);
          }}
        />
      );
    }

    // Fallback to gradient with initials
    return (
      <div className={`h-full w-full rounded-full flex items-center justify-center text-white ${userGradient}`}>
        <span className="font-medium text-sm">
          {user?.first_name?.charAt(0) || user?.email?.charAt(0) || '?'}
          {user?.last_name?.charAt(0) || ''}
        </span>
      </div>
    );
  };

  return (
    <motion.header 
      className={`sticky top-0 z-30 transition-all duration-300 w-full ${
        scrolled 
          ? "bg-white/95 backdrop-blur-sm shadow-md" 
          : "bg-white border-b border-nextgen-blue/10"
      }`}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Single row header with increased height - adjust width to prevent compression */}
      <div className="px-4 sm:px-6 lg:px-8 py-5 flex justify-between items-center transition-all duration-300"
        style={{
          marginLeft: sidebarOpen ? "0px" : "0px"
        }}
      >
        <div className="grid grid-cols-3 items-center w-full">
          {/* Left side - Toggle button & Page title */}
          <div className="flex items-center max-w-lg">
            {/* Mobile sidebar toggle - fixed width to prevent layout shift */}
            <div className="w-10 mr-3 flex-shrink-0">
              <motion.button
                onClick={toggleSidebar}
                className="text-nextgen-blue-dark hover:text-nextgen-blue focus:outline-none"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Toggle sidebar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </motion.button>
            </div>
            
            {/* Page title with animation - fixed position regardless of sidebar state */}
            <div className="transition-all duration-300 w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPath}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col justify-center"
                >
                  <h1 className="text-xl font-bold text-nextgen-blue-dark">{pageInfo.title}</h1>
                  <p className="text-sm text-nextgen-orange/80 truncate">{pageInfo.description}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Center - Date and time - properly centered with drop shadow */}
          <div className="flex justify-center items-center">
            <motion.div 
              className="hidden md:flex items-center justify-center"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <div className="bg-white px-5 py-2 rounded-full shadow-sm border border-nextgen-blue/10 flex items-center relative">
                {/* Subtle glow effect */}
                <div className="absolute inset-0 rounded-full bg-nextgen-blue/5 blur-md -z-10"></div>
                
                <span className="text-base font-medium text-nextgen-blue-dark mr-2">{formattedTime}</span>
                <div className="h-3.5 w-0.5 bg-nextgen-blue/20 mx-2"></div>
                <span className="text-sm text-nextgen-orange-dark/70">{formattedDate}</span>
              </div>
            </motion.div>
          </div>

          {/* Right side - User profile */}
          <div className="flex items-center justify-end space-x-5">
            {/* Notification dropdown */}
            <NotificationDropdown 
              isOpen={showNotifications}
              onToggle={toggleNotifications}
              onClose={() => setShowNotifications(false)}
            />

            {/* User profile button */}
            <div className="relative">
              <motion.button
                type="button"
                className="flex items-center space-x-3 bg-white rounded-full focus:outline-none shadow-sm border border-nextgen-blue/10 p-2 pl-2 pr-4 hover:bg-nextgen-blue/5"
                onClick={toggleUserMenu}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <div className="h-8 w-8 rounded-full overflow-hidden flex items-center justify-center">
                  {renderAvatar()}
                </div>
                <span className="hidden md:flex items-center space-x-1">
                  <span className="font-medium text-base text-nextgen-blue-dark">
                    {user?.first_name || user?.email?.split('@')[0]}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-nextgen-blue-dark/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </motion.button>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="origin-top-right absolute right-0 mt-2 w-64 rounded-xl overflow-hidden shadow-lg bg-white ring-1 ring-nextgen-blue/10"
                  >
                    {/* Enhanced User info section */}
                    <div className="bg-gradient-to-r from-nextgen-blue/10 to-nextgen-orange/10 p-4">
                      <div className="flex items-center mb-3">
                        <div className="h-12 w-12 rounded-full overflow-hidden mr-3 shadow-sm">
                          {renderAvatar()}
                        </div>
                        <div>
                          <p className="font-bold text-nextgen-blue-dark">
                            {user?.first_name || ''} {user?.last_name || ''}
                          </p>
                          <p className="text-xs text-nextgen-orange/80 truncate">{user?.email}</p>
                        </div>
                      </div>
                      <div className="text-xs text-nextgen-blue-dark/70 mt-1 bg-white/50 rounded-md p-1.5 backdrop-blur-sm">
                        <span className="font-medium">Last login:</span> {new Date().toLocaleDateString()}
                      </div>
                      <div className="text-xs text-nextgen-blue-dark/70 mt-1 bg-white/50 rounded-md p-1.5 backdrop-blur-sm">
                        <span className="font-medium">Role:</span> {user?.role || 'Staff'}
                      </div>
                    </div>
                    
                    {/* Menu Actions */}
                    <div className='my-2'>                    
                      <hr className="my-2 border-nextgen-blue/10" />
                      
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowProfileSettings(true);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm flex items-center space-x-3 bg-white hover:bg-nextgen-blue/5 text-nextgen-blue-dark transition-colors"
                      >
                        <div className="h-7 w-7 rounded-full bg-white border border-nextgen-blue/20 flex items-center justify-center shadow-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-nextgen-blue-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <span className="font-medium">Profile Settings</span>
                      </button>
                      
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-sm flex items-center space-x-3 bg-white hover:bg-nextgen-blue/5 text-nextgen-blue-dark transition-colors"
                      >
                        <div className="h-7 w-7 rounded-full bg-white border border-nextgen-blue/20 flex items-center justify-center shadow-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-nextgen-blue-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 0v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                        </div>
                        <span className="font-medium">Sign out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Settings Modal */}
      <ProfileSettingsModal
        isOpen={showProfileSettings}
        onClose={() => setShowProfileSettings(false)}
      />
    </motion.header>
  );
};

export default Header;