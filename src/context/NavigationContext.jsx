import { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

const NavigationContext = createContext();

export const NavigationProvider = ({ children }) => {
  const initialRenderRef = useRef(true);
  
  // On desktop, start with the sidebar open
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  
  const location = useLocation();
  
  // Create stable function references
  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  
  // Auto-close sidebar on mobile when navigating
  useEffect(() => {
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      return;
    }
    
    if (window.innerWidth < 768) {
      closeSidebar();
    }
  }, [location.pathname, location.search, closeSidebar]);
  
  // Apply proper body styles when sidebar is open/closed to prevent scrolling issues
  useEffect(() => {
    if (window.innerWidth < 768) {
      if (sidebarOpen) {
        document.body.classList.add('overflow-hidden');
      } else {
        document.body.classList.remove('overflow-hidden');
      }
    }
    
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [sidebarOpen]);
  
  // Responsive behavior - open sidebar on desktop, close on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        openSidebar();
      } else {
        closeSidebar();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [openSidebar, closeSidebar]);
  
  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    sidebarOpen, 
    setSidebarOpen,
    toggleSidebar,
    closeSidebar,
    openSidebar
  }), [sidebarOpen, toggleSidebar, closeSidebar, openSidebar]);
  
  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};