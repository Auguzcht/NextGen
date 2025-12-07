import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useRef, startTransition } from 'react';

// Route preloader mapping
const routePreloaders = {
  '/dashboard': () => import('../../pages/Dashboard.jsx'),
  '/children': () => import('../../pages/ChildrenPage.jsx'),
  '/attendance': () => import('../../pages/AttendancePage.jsx'),
  '/guardians': () => import('../../pages/GuardiansPage.jsx'),
  '/reports': () => import('../../pages/ReportsPage.jsx'),
  '/settings': () => import('../../pages/SettingsPage.jsx'),
  '/staff': () => import('../../pages/StaffManagementPage.jsx'),
  '/staff/assignments': () => import('../../pages/StaffAssignmentsPage.jsx'),
};

// Track which routes have been preloaded
const preloadedRoutes = new Set();

// Preload a route
const preloadRoute = (path) => {
  // Extract base path without query params
  const basePath = path.split('?')[0];
  
  if (preloadedRoutes.has(basePath)) {
    return Promise.resolve(); // Already preloaded
  }
  
  const preloader = routePreloaders[basePath];
  if (preloader) {
    return preloader()
      .then((module) => {
        preloadedRoutes.add(basePath);
      })
      .catch((err) => {
        console.error('[PreloadLink] Failed to preload route:', basePath, err);
      });
  }
  return Promise.resolve();
};

/**
 * Enhanced NavLink that preloads route components on hover/focus
 * This makes navigation feel instant like Next.js
 */
const PreloadLink = ({ to, children, onMouseEnter, onFocus, onClick, ...props }) => {
  const hasPreloaded = useRef(false);
  const navigate = useNavigate();
  
  const handlePreload = () => {
    if (!hasPreloaded.current && to) {
      startTransition(() => {
        preloadRoute(to);
        hasPreloaded.current = true;
      });
    }
  };
  
  const handleMouseEnter = (e) => {
    handlePreload();
    onMouseEnter?.(e);
  };
  
  const handleFocus = (e) => {
    handlePreload();
    onFocus?.(e);
  };

  const handleClick = (e) => {
    const basePath = to?.split('?')[0];
    
    // Ensure the route is loaded before navigating
    if (to && !preloadedRoutes.has(basePath)) {
      e.preventDefault();
      preloadRoute(to).then(() => {
        startTransition(() => {
          navigate(to);
        });
      });
    }
    onClick?.(e);
  };
  
  return (
    <NavLink
      to={to}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
      onClick={handleClick}
      {...props}
    >
      {children}
    </NavLink>
  );
};

export default PreloadLink;
export { preloadRoute };
