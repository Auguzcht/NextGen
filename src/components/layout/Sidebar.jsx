import { useState, memo, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigation } from '../../context/NavigationContext.jsx';
import { NextGenLogoSvg } from '../../assets/index.js';

const Sidebar = () => {
  const { sidebarOpen, closeSidebar } = useNavigation();
  const { staffProfile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [logoError, setLogoError] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState(null);
  const [activeSubpage, setActiveSubpage] = useState(null);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
      navigate('/login', { replace: true });
    }
  };

  // Define navigation items with subpages where appropriate
  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { name: 'Children', path: '/children', icon: 'user-smile' },
    { 
      name: 'Attendance', 
      path: '/attendance', 
      icon: 'clipboard-check',
      subpages: [
        { name: 'Check-in', path: '/attendance?tab=checkin' },
        { name: 'Records', path: '/attendance?tab=records' }
      ]
    },
    { name: 'Guardians', path: '/guardians', icon: 'user-heart' },
    
    // Only show staff management for coordinators and administrators
    ...(staffProfile?.role === 'Administrator' || staffProfile?.role === 'Coordinator' ? [
      { 
        name: 'Staff', 
        path: '/staff', 
        icon: 'user-follow',
        subpages: [
          { name: 'Staff List', path: '/staff?tab=list' },
          { name: 'Assignments', path: '/staff?tab=assignments' }
        ]
      }
    ] : []),
    
    { 
      name: 'Reports', 
      path: '/reports', 
      icon: 'bar-chart-box',
      subpages: [
        { name: 'Attendance', path: '/reports?tab=attendance' },
        { name: 'Growth', path: '/reports?tab=growth' },
        { name: 'Weekly', path: '/reports?tab=weekly' }
      ]
    },
    
    // Only show settings for administrators
    ...(staffProfile?.role === 'Administrator' ? [
      { 
        name: 'Settings', 
        path: '/settings', 
        icon: 'settings-2'
      }
    ] : [])
  ];

  // Check if a subpage is active
  const isSubpageActive = (path) => {
    if (path.includes('?tab=')) {
      const [basePath, query] = path.split('?');
      const tabValue = new URLSearchParams(query).get('tab');
      const currentTab = new URLSearchParams(location.search).get('tab');
      
      return location.pathname === basePath && currentTab === tabValue;
    }
    return location.pathname === path;
  };

  // Check if a menu item is active
  const isMenuActive = (item) => {
    if (item.subpages) {
      return location.pathname.startsWith(item.path.split('?')[0]);
    }
    return location.pathname === item.path;
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

  // Line variants for submenus
  const highlightLineVariants = {
    hidden: { height: 0, opacity: 0 },
    visible: { 
      height: '100%',
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut" 
      }
    },
    exit: {
      height: 0,
      opacity: 0,
      transition: { duration: 0.3 }
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className={`fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity ${sidebarOpen ? 'opacity-100 z-40' : 'opacity-0 -z-10'}`} 
        onClick={closeSidebar} 
      />
      
      {/* Sidebar */}
      <div className={`fixed top-0 left-0 bottom-0 flex flex-col w-64 bg-indigo-800 text-white transition-all duration-300 transform z-50 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} md:static md:z-auto`}>
        {/* Logo header */}
        <motion.div 
          className="flex-shrink-0 p-4 flex items-center justify-between border-b border-indigo-700"
          initial="hidden"
          animate="visible"
          variants={logoVariants}
        >
          <Link to="/dashboard" className="flex items-center">
            {logoError ? (
              <span className="h-10 w-10 flex items-center justify-center bg-indigo-600 rounded-full mr-2">N</span>
            ) : (
              <motion.img 
                className="h-10 w-auto mr-2" 
                src={NextGenLogoSvg} 
                alt="NextGen" 
                onError={() => setLogoError(true)}
                whileHover={{ 
                  scale: 1.05,
                  transition: { duration: 0.3 } 
                }}
              />
            )}
            <motion.span 
              className="text-xl font-semibold"
              whileHover={{
                scale: 1.05,
                color: "#30cee4",
                transition: { duration: 0.2 }
              }}
            >
              NextGen
            </motion.span>
          </Link>
          <button 
            className="md:hidden rounded-md p-2 inline-flex items-center justify-center text-indigo-200 hover:text-white hover:bg-indigo-700 focus:outline-none"
            onClick={closeSidebar}
          >
            <span className="sr-only">Close sidebar</span>
            <i className="ri-close-line text-xl"></i>
          </button>
        </motion.div>
        
        {/* Navigation links */}
        <div className="flex-1 overflow-y-auto pt-4">
          <nav className="px-2 py-2 space-y-1">
            {navLinks.map((link, index) => (
              <motion.div 
                key={link.path} 
                custom={index}
                variants={menuItemVariants}
                initial="hidden"
                animate="visible"
                className="my-1"
              >
                {link.subpages ? (
                  <div>
                    <motion.button
                      onClick={() => toggleSubpages(link.name)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                        isMenuActive(link)
                          ? 'bg-indigo-900 text-white shadow-md'
                          : 'text-indigo-100 hover:bg-indigo-700'
                      }`}
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
                        <i className={`ri-${link.icon} mr-3 text-lg ${isMenuActive(link) ? 'text-white' : 'text-indigo-300 group-hover:text-white'}`}></i>
                        {link.name}
                      </div>
                      
                      {/* Arrow icon with animation */}
                      <motion.i
                        className="ri-arrow-down-s-line"
                        animate={{ 
                          rotate: expandedMenu === link.name ? 180 : 0,
                          scale: expandedMenu === link.name ? 1.1 : 1
                        }}
                        transition={{ duration: 0.3 }}
                      ></motion.i>
                    </motion.button>
                    
                    {/* Submenu items */}
                    <AnimatePresence>
                      {expandedMenu === link.name && (
                        <motion.div
                          variants={subMenuContainerVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="ml-8 mt-2 space-y-1 relative"
                        >
                          {/* Vertical highlight line */}
                          <div className="absolute left-0 top-0 bottom-0 w-0.5 h-full">
                            <motion.div 
                              className="w-full bg-nextgen-blue-dark/30 absolute inset-0 rounded-full"
                              variants={highlightLineVariants}
                            />
                          </div>
                          
                          {link.subpages.map((subpage) => (
                            <motion.div
                              key={subpage.path}
                              variants={subMenuItemVariants}
                            >
                              <Link
                                to={subpage.path}
                                className={`flex items-center px-3 py-2 text-sm rounded-md ${
                                  isSubpageActive(subpage.path)
                                    ? 'text-white bg-indigo-800 font-medium'
                                    : 'text-indigo-200 hover:bg-indigo-700 hover:text-white'
                                }`}
                                onClick={() => setActiveSubpage(subpage.path)}
                              >
                                <motion.span 
                                  className={`w-2 h-2 mr-3 rounded-full ${
                                    isSubpageActive(subpage.path)
                                      ? 'bg-nextgen-blue'
                                      : 'bg-nextgen-blue/30'
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
                              </Link>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link
                    to={link.path}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${isMenuActive(link) ? 'bg-indigo-900 text-white' : 'text-indigo-100 hover:bg-indigo-700'}`}
                  >
                    <motion.i 
                      className={`ri-${link.icon} mr-3 text-lg ${isMenuActive(link) ? 'text-white' : 'text-indigo-300 group-hover:text-white'}`}
                      whileHover={{ 
                        rotate: 10,
                        scale: 1.15,
                        transition: { duration: 0.2 } 
                      }}
                    ></motion.i>
                    {link.name}
                  </Link>
                )}
              </motion.div>
            ))}
          </nav>
        </div>
        
        {/* User profile section */}
        <div className="border-t border-indigo-700 p-4">
          {staffProfile && (
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <motion.div 
                  className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center"
                  whileHover={{ 
                    scale: 1.05,
                    backgroundColor: "#30cee4",
                    transition: { duration: 0.3 }
                  }}
                >
                  <span className="text-xl font-medium">{`${staffProfile.first_name?.[0] || ''}${staffProfile.last_name?.[0] || ''}`}</span>
                </motion.div>
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium">{`${staffProfile.first_name || ''} ${staffProfile.last_name || ''}`}</div>
                <div className="text-xs text-indigo-300 capitalize">{staffProfile.role}</div>
              </div>
            </div>
          )}
          
          <motion.button 
            onClick={handleLogout}
            className="flex items-center w-full text-indigo-100 py-2 px-3 rounded-md hover:bg-indigo-700 transition-colors"
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <i className="ri-logout-box-line text-indigo-300 text-lg mr-3"></i>
            <span className="text-sm font-medium">Sign Out</span>
          </motion.button>
        </div>
        
        {/* Version indicator */}
        <motion.div
          className="px-4 py-2 text-center text-xs text-indigo-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          NextGen Ministry v1.0
        </motion.div>
      </div>
    </>
  );
};

export default memo(Sidebar);