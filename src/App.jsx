import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { NavigationProvider } from './context/NavigationContext.jsx';
import LoadingScreen from './components/common/LoadingScreen.jsx';
import LoginPage from './pages/LoginPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ChildrenPage from './pages/ChildrenPage.jsx';
import AttendancePage from './pages/AttendancePage.jsx';
import GuardiansPage from './pages/GuardiansPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import StaffManagementPage from './pages/StaffManagementPage.jsx';
import Header from './components/layout/Header.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import Footer from './components/layout/Footer.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

// AuthCheck component for route protection
const AuthCheck = () => {
  const { user, loading, initialized, refreshSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Handle stalled auth state
  useEffect(() => {
    const stalledTimer = setTimeout(() => {
      if (loading) {
        console.log('Auth check - Forcing refresh after timeout');
        refreshSession();
        // Force end the loading state after another short delay
        setTimeout(() => setInitialLoading(false), 2000);
      }
    }, 5000);
    
    return () => clearTimeout(stalledTimer);
  }, [loading, refreshSession]);
  
  // Show loading screen during initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 2000); // Show loading for at least 2 seconds for better UX
    
    return () => clearTimeout(timer);
  }, []);
  
  // While loading auth state, show loading screen
  if ((initialLoading || (loading && !initialized))) {
    return <LoadingScreen finishLoading={() => setInitialLoading(false)} />;
  }
  
  // If no user, redirect to login
  if (!user) {
    console.log('No authenticated user, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // User is authenticated, continue to the requested page
  return <Outlet />;
};

// Main Layout component that wraps all authenticated pages
const MainLayout = () => {
  const location = useLocation();
  
  return (
    <NavigationProvider>
      <div className="flex min-h-screen bg-gray-100 overflow-hidden">
        {/* Fixed sidebar that doesn't scroll */}
        <div className="fixed h-full z-30">
          <Sidebar />
        </div>
        
        {/* Main content area with fixed header and scrollable content */}
        <div className="flex flex-col flex-1 ml-0 md:ml-64 transition-all duration-300 w-full min-h-screen">
          {/* Fixed header at the top */}
          <div className="fixed top-0 right-0 left-0 z-20 md:left-64 transition-all duration-300">
            <Header />
          </div>
          
          {/* Add a spacer div that exactly matches the header height plus any padding */}
          <div className="h-20"></div> {/* Increased from h-16 to h-20 to account for padding */}
          
          {/* Main content with padding */} 
          <main className="flex-1 p-4 overflow-y-auto sm:p-6 lg:p-8 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname + location.search}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
          
          {/* Footer at the bottom of the scrollable area */}
          <Footer />
        </div>
      </div>
    </NavigationProvider>
  );
};

// PublicRoute component for login page
const PublicRoute = () => {
  const { user, loading, loginRedirectInProgress, initialized } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // If user is already logged in and on login page, redirect to dashboard
  useEffect(() => {
    if (user && !loginRedirectInProgress && location.pathname === '/login') {
      console.log('User already authenticated, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [user, loginRedirectInProgress, navigate, location]);
  
  // Show loading while auth is initializing
  if (loading && !initialized) {
    return <LoadingScreen isInitialLoadingComplete={true} />;
  }
  
  // If user is already logged in, redirect them
  if (user && !loginRedirectInProgress) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Outlet />;
};

// Simple component to handle redirects
const RedirectHandler = () => {
  const { user } = useAuth();
  return <Navigate replace to={user ? '/dashboard' : '/login'} />;
};

function AppContent() {
  const { loading, initialized } = useAuth();
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Effect to disable initial loading screen after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 2000); // Show loading for at least 2 seconds
    
    return () => clearTimeout(timer);
  }, []);
  
  // Show initial loading screen
  if (initialLoading || (loading && !initialized)) {
    return <LoadingScreen finishLoading={() => setInitialLoading(false)} />;
  }
  
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      
      {/* Protected routes with persistent layout */}
      <Route element={<AuthCheck />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/children" element={<ChildrenPage />} />
          
          {/* Attendance routes */}
          <Route path="/attendance" element={<AttendancePage />} />
          
          <Route path="/guardians" element={<GuardiansPage />} />
          
          {/* Staff routes */}
          <Route path="/staff" element={<StaffManagementPage />} />
          
          {/* Reports routes */}
          <Route path="/reports" element={<ReportsPage />} />
          
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      
      {/* Root path redirect */}
      <Route path="/" element={<RedirectHandler />} />
      
      {/* Catch-all redirect */}
      <Route path="*" element={<RedirectHandler />} />
    </Routes>
  );
}

function App() {
  return (
    <Router basename="/nextgen">
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;