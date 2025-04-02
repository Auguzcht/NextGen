import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import './App.css';

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  console.log('ProtectedRoute state:', { user, loading }); // Add this
  
  if (loading) {
    return <LoadingScreen />; // Use your LoadingScreen instead of a simple spinner
  }
  
  if (!user) {
    console.log('No user, redirecting to login'); // Add this
    return <Navigate to="/login" replace />;
  }
  
  console.log('User authenticated, rendering protected content'); // Add this
  return children;
};

// Public route component - redirects to dashboard if already logged in
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex h-screen w-full items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    </div>;
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function AppContent() {
  const [initialLoading, setInitialLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  
  console.log('AppContent rendering, initialLoading:', initialLoading, 'authLoading:', authLoading);

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  // Debug element that shows in all cases
  const debugElement = process.env.NODE_ENV === 'development' ? (
    <div className="fixed top-0 left-0 bg-red-500 text-white p-2 z-50">
      initialLoading: {String(initialLoading)}, authLoading: {String(authLoading)}
    </div>
  ) : null;

  // Show loading screen during both initialLoading and authLoading
  if (initialLoading || authLoading) {
    return (
      <>
        {debugElement}
        <LoadingScreen />
      </>
    );
  }

  return (
    <>
      {debugElement}
      <Routes>
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <LoginForm />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
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