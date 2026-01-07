import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../../context/AuthContext';

/**
 * ProtectedRoute Component
 * Restricts access to routes based on user authentication and permission level
 * 
 * @param {ReactNode} children - The components to render if authorized
 * @param {number} requiredLevel - Minimum access level required (default: 1)
 * @param {string} redirectTo - Where to redirect if unauthorized (default: '/dashboard')
 */
const ProtectedRoute = ({ 
  children, 
  requiredLevel = 1, 
  redirectTo = '/dashboard' 
}) => {
  const { user, loading, isAuthenticated, hasPermission } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-nextgen-teal mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has required permission level
  if (!hasPermission(requiredLevel)) {
    // User is authenticated but doesn't have permission
    // Redirect to dashboard with a toast notification (handled by the page)
    return <Navigate to={redirectTo} replace state={{ 
      unauthorized: true,
      message: 'You do not have permission to access this page.' 
    }} />;
  }

  // User is authenticated and has permission
  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  requiredLevel: PropTypes.number,
  redirectTo: PropTypes.string
};

export default ProtectedRoute;
