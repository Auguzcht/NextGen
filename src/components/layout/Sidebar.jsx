import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigation } from '../../context/NavigationContext.jsx';

// Use the base URL from Vite to handle both development and production paths
const NextGenLogoSvg = `${import.meta.env.BASE_URL}NextGen-Logo.svg`;

const Sidebar = () => {
  const { sidebarOpen } = useNavigation();
  const { staffProfile } = useAuth();
  const location = useLocation();
  const [logoError, setLogoError] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState(null);
  const [activeSubpage, setActiveSubpage] = useState(null);
  
  // Reset logo error if sidebar is closed/opened
  useEffect(() => {
    setLogoError(false);
  }, [sidebarOpen]);

  // Define navigation items with subpages where appropriate
  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: 'dashboard', exact: true },
    { name: 'Children', path: '/children', icon: 'child' },
    { name: 'Attendance', path: '/attendance', icon: 'clipboard-check' },
    { name: 'Guardians', path: '/guardians', icon: 'users' },
    
    // Only show staff management for coordinators and administrators
    ...(staffProfile?.role === 'Administrator' || staffProfile?.role === 'Coordinator' ? [
      { 
        name: 'Staff', 
        path: '/staff', 
        icon: 'staff',
        subpages: [
          { name: 'Staff List', path: '/staff?tab=list' },
          { name: 'Assignments', path: '/staff?tab=assignments' }
        ]
      }
    ] : []),
    
    { name: 'Reports', path: '/reports', icon: 'document-report' },
    
    // Settings without subpages
    ...(staffProfile?.role === 'Administrator' ? [
      { name: 'Settings', path: '/settings', icon: 'cog' }
    ] : [])
  ];

  // Check if a menu item is active
  const isMenuActive = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    if (item.subpages) {
      return location.pathname.startsWith(item.path.split('?')[0]);
    }
    return location.pathname === item.path;
  };

  // Check if subpage is active
  const isSubpageActive = (path) => {
    if (path.includes('?tab=')) {
      const [basePath, query] = path.split('?');
      const tabValue = new URLSearchParams(query).get('tab');
      const currentTab = new URLSearchParams(location.search).get('tab');
      
      return location.pathname === basePath && currentTab === tabValue;
    }
    return location.pathname === path;
  };

  // Update active subpage when location changes
  useEffect(() => {
    const menuWithActiveSubpage = navLinks.find(item => 
      item.subpages?.some(subpage => isSubpageActive(subpage.path))
    );
    
    if (menuWithActiveSubpage) {
      setExpandedMenu(menuWithActiveSubpage.name);
      
      const activeSubpagePath = menuWithActiveSubpage.subpages.find(
        subpage => isSubpageActive(subpage.path)
      )?.path;
      
      setActiveSubpage(activeSubpagePath);
    }
  }, [location.pathname, location.search]);

  // Toggle subpage visibility
  const toggleSubpages = (itemName) => {
    setExpandedMenu(expandedMenu === itemName ? null : itemName);
  };

  // Animation variants
  const logoVariants = {
    hidden: { scale: 0.8, opacity: 0, y: -10 },
    visible: { 
      scale: 1, 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: 0.3
      }
    }
  };
  
  const menuItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: 0.3 + (i * 0.1),
        duration: 0.5,
        ease: "easeOut"
      }
    })
  };
  
  const subMenuContainerVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { 
      opacity: 1, 
      height: 'auto',
      transition: {
        duration: 0.4,
        ease: "easeInOut",
        staggerChildren: 0.1
      }
    },
    exit: { 
      opacity: 0, 
      height: 0,
      transition: {
        duration: 0.3,
        ease: "easeInOut"
      }
    }
  };
  
  const subMenuItemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  };

  const highlightLineVariants = {
    hidden: { height: 0, opacity: 0 },
    visible: (subpages) => ({ 
      height: '100%',
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut" 
      }
    }),
    exit: {
      height: 0,
      opacity: 0,
      transition: { duration: 0.3 }
    }
  };

  const activeMarkerVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: (index) => ({
      opacity: 1,
      height: 36,
      top: `calc(${index} * 44px)`,
      transition: { 
        type: "spring", 
        stiffness: 300, 
        damping: 25 
      }
    })
  };

  const borderGlowVariants = {
    initial: { 
      boxShadow: '0 0 0 rgba(48, 206, 228, 0)' 
    },
    animate: { 
      boxShadow: ['0 0 5px rgba(48, 206, 228, 0.2)', '0 0 12px rgba(48, 206, 228, 0.3)', '0 0 5px rgba(48, 206, 228, 0.2)'],
      transition: { 
        duration: 4,
        repeat: Infinity,
        repeatType: "reverse"
      }
    }
  };

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <motion.aside
          key="sidebar"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 260, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed z-50 h-screen left-0 top-0 bottom-0 overflow-hidden bg-gradient-to-b from-nextgen-blue-dark to-indigo-900 text-white shadow-lg md:static md:z-auto"
        >
          {/* Border glow effect */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial="initial"
            animate="animate"
            variants={borderGlowVariants}
          />
          
          {/* Logo header with animations */}
          <motion.div 
            className="flex flex-col items-center justify-center py-6 border-b border-nextgen-blue/30 relative overflow-hidden"
            initial="hidden"
            animate="visible"
            variants={logoVariants}
          >
            {/* Background glow effect */}
            <motion.div
              className="absolute inset-0 opacity-20"
              animate={{
                background: [
                  'radial-gradient(circle at center, rgba(48, 206, 228, 0.3) 0%, transparent 60%)',
                  'radial-gradient(circle at center, rgba(251, 118, 16, 0.2) 0%, transparent 60%)',
                  'radial-gradient(circle at center, rgba(48, 206, 228, 0.3) 0%, transparent 60%)'
                ]
              }}
              transition={{ 
                duration: 8, 
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut"
              }}
            />
            
            <NavLink to="/dashboard" className="flex flex-col items-center justify-center relative z-10">
              {logoError ? (
                <motion.span 
                  className="h-16 w-16 flex items-center justify-center bg-nextgen-blue rounded-full mb-2 shadow-lg shadow-nextgen-blue/20"
                  whileHover={{ scale: 1.05 }}
                >
                  <span className="text-2xl font-bold text-white">N</span>
                </motion.span>
              ) : (
                <motion.div whileHover={{ scale: 1.05 }}>
                  <img 
                    className="h-16 w-auto mb-2" 
                    src={NextGenLogoSvg} 
                    alt="NextGen"
                    onError={(e) => {
                      console.error("Logo failed to load:", e);
                      setLogoError(true);
                    }} 
                  />
                </motion.div>
              )}
              
              <motion.h1 
                className="text-xl font-bold text-white relative z-10"
                whileHover={{ scale: 1.05 }}
              >
                NextGen Ministry
              </motion.h1>
              
              <motion.p
                className="text-xs text-nextgen-blue-light mt-1 font-medium relative z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                Children's Ministry Management
              </motion.p>
            </NavLink>
          </motion.div>
          
          {/* Navigation links with animations */}
          <div className="flex flex-col h-full overflow-y-auto pt-4">
            <div className="flex-1 px-4 space-y-2">
              {navLinks.map((link, index) => (
                <motion.div 
                  key={link.path} 
                  className="my-1"
                  custom={index}
                  variants={menuItemVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {link.subpages ? (
                    <div>
                      <motion.button
                        onClick={() => toggleSubpages(link.name)}
                        className={`
                          sidebar-nav-button
                          ${isMenuActive(link) ? 'sidebar-nav-link-active' : 'sidebar-nav-link-inactive'}
                          border-transparent text-white
                        `}
                        whileHover={{ 
                          x: 4, 
                          transition: { duration: 0.2 } 
                        }}
                        whileTap={{ 
                          scale: 0.98, 
                          transition: { duration: 0.1 } 
                        }}
                      >
                        <div className="flex items-center">
                          <span className="sidebar-icon-container">
                            <motion.svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="sidebar-icon"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              whileHover={{ 
                                scale: 1.15, 
                                transition: { duration: 0.2 } 
                              }}
                            >
                              {renderIcon(link.icon)}
                            </motion.svg>
                          </span>
                          {link.name}
                        </div>
                        
                        {/* Arrow icon with animation */}
                        <motion.svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          animate={{ 
                            rotate: expandedMenu === link.name ? 180 : 0,
                            scale: expandedMenu === link.name ? 1.1 : 1
                          }}
                          transition={{ duration: 0.3 }}
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M19 9l-7 7-7-7" 
                          />
                        </motion.svg>
                      </motion.button>
                      
                      {/* Dropdown subpages with enhanced animation */}
                      <AnimatePresence>
                        {expandedMenu === link.name && (
                          <motion.div
                            variants={subMenuContainerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="ml-9 mt-2 space-y-1 relative"
                          >
                            {/* Vertical line indicator */}
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 h-full">
                              {/* Background line */}
                              <motion.div 
                                className="w-full bg-nextgen-blue/40 absolute inset-0 rounded-full"
                                custom={link.subpages}
                                variants={highlightLineVariants}
                              />
                              
                              {/* Active line highlight */}
                              {activeSubpage && link.subpages.some(subpage => subpage.path === activeSubpage) && (
                                <motion.div
                                  className="w-full bg-nextgen-blue absolute left-0 rounded-full"
                                  custom={link.subpages.findIndex(subpage => subpage.path === activeSubpage)}
                                  variants={activeMarkerVariants}
                                  initial="hidden"
                                  animate="visible"
                                  style={{ marginTop: 2 }}
                                />
                              )}
                            </div>
                            
                            {/* Subpage items with animations */}
                            {link.subpages.map((subpage) => (
                              <motion.div
                                key={subpage.path}
                                variants={subMenuItemVariants}
                              >
                                <NavLink
                                  to={subpage.path}
                                  className={({ isActive }) => `
                                    sidebar-subpage-link
                                    ${isSubpageActive(subpage.path) 
                                      ? 'sidebar-subpage-active' 
                                      : 'sidebar-subpage-inactive'}
                                  `}
                                  onClick={() => setActiveSubpage(subpage.path)}
                                >
                                  <motion.span 
                                    className={`sidebar-subpage-dot ${
                                      isSubpageActive(subpage.path)
                                        ? 'sidebar-subpage-dot-active'
                                        : 'sidebar-subpage-dot-inactive'
                                    }`}
                                    whileHover={{ 
                                      scale: 1.5, 
                                      backgroundColor: 'rgba(48, 206, 228, 1)',
                                      transition: { duration: 0.2 }
                                    }}
                                    animate={isSubpageActive(subpage.path) ? {
                                      scale: [1, 1.2, 1],
                                      transition: {
                                        duration: 1.5,
                                        repeat: Infinity,
                                        repeatType: "reverse"
                                      }
                                    } : {}}
                                  />
                                  {subpage.name}
                                </NavLink>
                              </motion.div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <NavLink
                      to={link.path}
                      className={({ isActive }) => `
                        sidebar-nav-link
                        ${isActive ? 'sidebar-nav-link-active' : 'sidebar-nav-link-inactive'}
                      `}
                    >
                      <motion.span 
                        className="sidebar-icon-container"
                        whileHover={{ 
                          rotate: 10,
                          scale: 1.15,
                          transition: { duration: 0.2 } 
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="sidebar-icon"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          {renderIcon(link.icon)}
                        </svg>
                      </motion.span>
                      {link.name}
                    </NavLink>
                  )}
                </motion.div>
              ))}
            </div>
            
            {/* Version indicator */}
            <motion.div
              className="px-4 py-3 text-center text-xs text-nextgen-blue-light/70 font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              NextGen Ministry v1.0
            </motion.div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

// Helper function to render SVG icons
function renderIcon(icon) {
  switch (icon) {
    case 'dashboard':
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      );
    case 'child':
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
        />
      );
    case 'clipboard-check':
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      );
    case 'users':
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      );
    case 'staff': // New staff icon different from users
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      );
    case 'document-report':
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      );
    case 'cog':
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
      );
    default:
      return null;
  }
}

export default Sidebar;