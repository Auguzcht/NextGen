import { useState, useEffect, lazy, Suspense, startTransition } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { NavigationProvider, useNavigation } from './context/NavigationContext.jsx';
import LoadingScreen from './components/common/LoadingScreen.jsx';
import ChangelogModal from './components/common/ChangelogModal.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import Header from './components/layout/Header.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import Footer from './components/layout/Footer.jsx';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { CURRENT_VERSION, shouldShowChangelog, markChangelogAsShown } from './utils/changelog.js';
import './App.css';

// Lazy load page components for better performance
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const ChildrenPage = lazy(() => import('./pages/ChildrenPage.jsx'));
const AttendancePage = lazy(() => import('./pages/AttendancePage.jsx'));
const GuardiansPage = lazy(() => import('./pages/GuardiansPage.jsx'));
const ReportsPage = lazy(() => import('./pages/ReportsPage.jsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'));
const StaffManagementPage = lazy(() => import('./pages/StaffManagementPage.jsx'));
const StaffAssignmentsPage = lazy(() => import('./pages/StaffAssignmentsPage.jsx'));

// Loading fallback component
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-nextgen-blue-light border-t-nextgen-blue-dark rounded-full animate-spin"></div>
      <p className="text-gray-600 text-sm">Loading...</p>
    </div>
  </div>
);// Wrapper component to log page mounting
const PageWrapper = ({ children, pageName }) => {
  useEffect(() => {
    console.log(`[App] ✅ ${pageName} component MOUNTED`);
    return () => {
      console.log(`[App] ❌ ${pageName} component UNMOUNTED`);
    };
  }, [pageName]);
  
  return children;
};

// AuthCheck component for route protection
const AuthCheck = () => {
  const { session, loading } = useAuth();
  const location = useLocation();
  
  // If still loading auth state, show a simple spinner (not full LoadingScreen)
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-nextgen-blue-light border-t-nextgen-blue-dark rounded-full animate-spin"></div>
          <p className="text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    );
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
  const { user } = useAuth();
  const [showChangelog, setShowChangelog] = useState(false);
  
  // Check if we should show the changelog on first login
  useEffect(() => {
    if (user) {
      if (shouldShowChangelog(user.id)) {
        // Delay showing the modal slightly to let the UI settle
        const timer = setTimeout(() => {
          setShowChangelog(true);
        }, 1000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [user]);
  
  const handleCloseChangelog = () => {
    setShowChangelog(false);
    if (user) {
      markChangelogAsShown(user.id);
    }
  };
  
  const handleOpenChangelog = () => {
    setShowChangelog(true);
  };
  
  return (
    <div className="flex min-h-screen bg-gray-100 overflow-hidden">
      {/* Changelog Modal */}
      <ChangelogModal 
        isOpen={showChangelog} 
        onClose={handleCloseChangelog}
        version={CURRENT_VERSION}
      />
      
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
          <Suspense fallback={<PageLoadingFallback />}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="w-full h-full"
            >
              <Outlet />
            </motion.div>
          </Suspense>
        </main>
        
        {/* Footer at the bottom of the scrollable area */}
        <Footer onVersionClick={handleOpenChangelog} />
      </div>
    </div>
  );
};

// PublicRoute component for login page
const PublicRoute = () => {
  const { user, loading, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Special case: Allow /reset-password to have a session (needed for password update)
  // Don't redirect to dashboard if user is on reset-password page
  useEffect(() => {
    // Only redirect if on /login page and has a session
    // Never redirect if on /reset-password
    if (session && location.pathname === '/login') {
      console.log('Session exists, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [session, navigate, location]);
  
  // Show loading while auth is initializing
  if (loading) {
    return <LoadingScreen isInitialLoadingComplete={true} />;
  }
  
  // Allow /reset-password to proceed even with a session
  // User needs to be authenticated to change their password
  if (location.pathname === '/reset-password') {
    return <Outlet />;
  }
  
  // If user is already logged in and trying to access login, redirect them
  if (session && location.pathname === '/login') {
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
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Only show loading screen once during initial auth initialization
  useEffect(() => {
    if (initialized && !initialLoadComplete) {
      // Give a brief moment for auth to settle
      const timer = setTimeout(() => {
        setInitialLoadComplete(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [initialized, initialLoadComplete]);
  
  // Show initial loading screen ONLY during first load
  if (!initialLoadComplete) {
    return <LoadingScreen finishLoading={() => setInitialLoadComplete(true)} />;
  }
  
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>
      
      {/* Protected routes with persistent layout */}
      <Route element={<AuthCheck />}>
        <Route element={<MainLayout />}>
          {/* Volunteer+ (access_level: 1+) */}
          <Route path="/dashboard" element={
            <ProtectedRoute requiredLevel={1}>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          {/* Staff Assignments - Volunteer+ */}
          <Route path="/staff/assignments" element={
            <ProtectedRoute requiredLevel={1}>
              <StaffAssignmentsPage />
            </ProtectedRoute>
          } />
          
          {/* Team Leader+ (access_level: 3+) */}
          <Route path="/children" element={
            <ProtectedRoute requiredLevel={3}>
              <ChildrenPage />
            </ProtectedRoute>
          } />
          
          <Route path="/attendance" element={
            <ProtectedRoute requiredLevel={3}>
              <AttendancePage />
            </ProtectedRoute>
          } />
          
          <Route path="/guardians" element={
            <ProtectedRoute requiredLevel={3}>
              <GuardiansPage />
            </ProtectedRoute>
          } />
          
          {/* Coordinator+ (access_level: 5+) */}
          <Route path="/reports" element={
            <ProtectedRoute requiredLevel={5}>
              <ReportsPage />
            </ProtectedRoute>
          } />
          
          {/* Admin Only (access_level: 10) */}
          <Route path="/staff" element={
            <ProtectedRoute requiredLevel={10}>
              <StaffManagementPage />
            </ProtectedRoute>
          } />
          
          <Route path="/settings" element={
            <ProtectedRoute requiredLevel={10}>
              <SettingsPage />
            </ProtectedRoute>
          } />
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