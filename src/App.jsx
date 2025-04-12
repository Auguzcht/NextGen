import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import LoadingScreen from './components/common/LoadingScreen.jsx';
import LoginForm from './components/auth/LoginForm.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ChildrenPage from './pages/ChildrenPage.jsx';
import AttendancePage from './pages/AttendancePage.jsx';
import GuardiansPage from './pages/GuardiansPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import StaffManagementPage from './pages/StaffManagementPage.jsx';
import LoginPage from './pages/LoginPage';
import './App.css';

// Protected route component - prevents access to routes when not authenticated
const ProtectedRoute = ({ children }) => {
  const { user, loading, loginRedirectInProgress } = useAuth();
  const location = useLocation();
  
  // Show loading screen while auth state is being determined
  if (loading) {
    return <LoadingScreen 
      finishLoading={() => {}} 
      isInitialLoadingComplete={false}
    />;
  }
  
  // If no user is logged in, redirect to login
  if (!user) {
    // Save the attempted URL for redirecting after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // User is authenticated, render the protected content
  return children;
};

// Update the PublicRoute component for better debugging
const PublicRoute = ({ children }) => {
  const { user, loading, loginRedirectInProgress } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // More detailed debug logging
  useEffect(() => {
    if (user) {
      console.log('PublicRoute - Auth state:', { 
        userId: user.id,
        loginRedirectInProgress, 
        pathname: location.pathname,
        shouldRedirect: user && !loginRedirectInProgress && location.pathname === '/login'
      });
    }
  }, [user, loginRedirectInProgress, location]);
  
  // Show loading screen while auth state is being determined
  if (loading) {
    return <LoadingScreen 
      finishLoading={() => {}} 
      isInitialLoadingComplete={true}
    />;
  }
  
  // CRITICAL: Only redirect if:
  // 1. User is authenticated
  // 2. We're not already in the process of redirecting from the login form
  // 3. We're actually on the login page (to avoid redirect loops)
  if (user && !loginRedirectInProgress && location.pathname === '/login') {
    console.log('User authenticated in PublicRoute, redirecting to dashboard');
    // Force a navigation with a small delay to ensure all state is settled
    setTimeout(() => {
      navigate('/dashboard', { replace: true });
    }, 50);
    
    // Return a temporary loading indicator while we redirect
    return <div className="fixed inset-0 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-nextgen-blue"></div>
    </div>;
  }
  
  // Either no user is logged in or we're in the middle of redirecting, render the public content
  return children;
};

function AppContent() {
  const [initialLoading, setInitialLoading] = useState(true);
  const { user, loading: authLoading, loginRedirectInProgress } = useAuth();
  const location = useLocation();

  useEffect(() => {
    console.log('AppContent - Current auth state:', { user, authLoading, loginRedirectInProgress });
  }, [user, authLoading, loginRedirectInProgress]);

  // Effect to disable initial loading screen after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 2000); // Show initial loading for at least 2 seconds for a better UX
    
    return () => clearTimeout(timer);
  }, []);
  
  // Show loading screen during both initialLoading and authLoading
  if (initialLoading || authLoading) {
    return (
      <LoadingScreen 
        finishLoading={() => setInitialLoading(false)} 
        isInitialLoadingComplete={!authLoading}
      />
    );
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } 
      />
      <Route 
        path="/" 
        element={<Navigate replace to={user ? "/dashboard" : "/login"} />} 
      />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      {/* Other routes remain unchanged */}
      <Route 
        path="/children" 
        element={
          <ProtectedRoute>
            <ChildrenPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/attendance" 
        element={
          <ProtectedRoute>
            <AttendancePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/guardians" 
        element={
          <ProtectedRoute>
            <GuardiansPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/reports" 
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/settings" 
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/staff" 
        element={
          <ProtectedRoute>
            <StaffManagementPage />
          </ProtectedRoute>
        } 
      />
      {/* Catch all route */}
      <Route 
        path="*" 
        element={
          <Navigate 
            to={user ? "/dashboard" : "/login"} 
            replace 
          />
        } 
      />
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