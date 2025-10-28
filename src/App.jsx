import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { NavigationProvider, useNavigation } from './context/NavigationContext.jsx';
import LoadingScreen from './components/common/LoadingScreen.jsx';
import LoginPage from './pages/LoginPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ChildrenPage from './pages/ChildrenPage.jsx';
import AttendancePage from './pages/AttendancePage.jsx';
import GuardiansPage from './pages/GuardiansPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import StaffManagementPage from './pages/StaffManagementPage.jsx';
import StaffAssignmentsPage from './pages/StaffAssignmentsPage.jsx';
import Header from './components/layout/Header.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import Footer from './components/layout/Footer.jsx';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

// AuthCheck component for route protection
const AuthCheck = () => {
  const { user, loading, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [initialLoading, setInitialLoading] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Show loading screen during initial load
  if (initialLoading || loading) {
    return <LoadingScreen finishLoading={() => setInitialLoading(false)} />;
  }
  
  // If no session, redirect to login
  if (!session) {
    console.log('No authenticated session, redirecting to login');
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
      <MainLayoutContent />
    </NavigationProvider>
  );
};

// New component for the main layout content
const MainLayoutContent = () => {
  const location = useLocation();
  const { sidebarOpen } = useNavigation(); // Now this is inside NavigationProvider
  
  return (
    <div className="flex min-h-screen bg-gray-100 overflow-hidden">
      {/* Fixed sidebar that doesn't scroll */}
      <div className="fixed h-full z-30">
        <Sidebar />
      </div>
      
      {/* Main content area with fixed header and scrollable content */}
      <div 
        className="flex flex-col flex-1 transition-all duration-300 w-full min-h-screen"
        style={{ 
          marginLeft: sidebarOpen ? "260px" : "0px" 
        }}
      >
        {/* Fixed header at the top */}
        <div className="fixed top-0 right-0 left-0 z-20 transition-all duration-300"
             style={{ 
               left: sidebarOpen ? "260px" : "0px" 
             }}>
          <Header />
        </div>
        
        {/* Add a spacer div that exactly matches the header height plus any padding */}
        <div className="h-20"></div>
        
        {/* Main content with padding */} 
        <main className="flex-1 p-4 overflow-auto sm:p-6 lg:p-8 relative">
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
  );
};

// PublicRoute component for login page
const PublicRoute = () => {
  const { user, loading, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    if (session && location.pathname === '/login') {
      console.log('Session exists, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [session, navigate, location]);
  
  // Show loading while auth is initializing
  if (loading) {
    return <LoadingScreen isInitialLoadingComplete={true} />;
  }
  
  // If user is already logged in, redirect them
  if (session) {
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
          <Route path="/staff/assignments" element={<StaffAssignmentsPage />} />
          
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
  // Use conditional basename based on environment
  const basePath = import.meta.env.DEV ? "/nextgen" : "/";
  
  return (
    <Router basename={basePath}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
      <Toaster 
        position="top-right"
        toastOptions={{
          // Optional: customize your toast styles
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            theme: {
              primary: '#4aed88',
            },
          },
          error: {
            duration: 5000,
            theme: {
              primary: '#ff4b4b',
            },
          },
        }} 
      />
    </Router>
  );
}

export default App;