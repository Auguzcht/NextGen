import { createContext, useState, useEffect, useContext, useRef } from 'react';
import { toast } from 'react-hot-toast';
import supabase from '../services/supabase';
import { clearChangelogSession, markNewLogin } from '../utils/changelog.js';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const initializedRef = useRef(false);

  // Fetch staff profile from staff table
  const fetchStaffProfile = async (authUser) => {
    if (!authUser) {
      setUser(null);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('staff_id, user_id, first_name, last_name, email, role, is_active, access_level, profile_image_url, profile_image_path, phone_number')
        .eq('user_id', authUser.id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }
      
      if (!data) {
        
        // Create fallback user object with ministry-specific roles
        const fallbackUser = { 
          id: authUser.id,
          uid: authUser.id, // Add uid for Header component
          email: authUser.email,
          role: authUser.user_metadata?.role || 'Staff',
          first_name: authUser.user_metadata?.first_name || 'Unknown',
          last_name: authUser.user_metadata?.last_name || 'User',
          status: 'Active',
          access_level: 1,
          is_active: true,
          profile_image_url: null,
          profile_image_path: null,
          last_sign_in_at: authUser.last_sign_in_at
        };
        
        setUser(fallbackUser);
        
        // Try to create a staff record if missing
        try {
          const { error: insertError } = await supabase.from('staff').insert({
            user_id: authUser.id,
            first_name: authUser.user_metadata?.first_name || 'Unknown',
            last_name: authUser.user_metadata?.last_name || 'User',
            email: authUser.email,
            role: authUser.user_metadata?.role || 'Staff',
            status: 'Active',
            is_active: true,
            access_level: 1 // Default to regular staff access
          });
          
          if (!insertError) {
            // Staff record created successfully
          }
        } catch (createErr) {
          console.error('Failed to create staff record:', createErr);
        }
      } else {
        // Map staff record to user object with ministry-specific fields
        setUser({
          id: authUser.id,
          uid: authUser.id, // Add uid for Header component
          email: authUser.email,
          first_name: data.first_name || authUser.user_metadata?.first_name,
          last_name: data.last_name || authUser.user_metadata?.last_name,
          role: data.role || authUser.user_metadata?.role || 'Staff',
          status: data.status || 'Active',
          access_level: data.access_level || 1,
          is_active: data.is_active !== undefined ? data.is_active : true,
          staff_id: data.staff_id,
          profile_image_url: data.profile_image_url,
          profile_image_path: data.profile_image_path,
          phone_number: data.phone_number,
          user_id: data.user_id,
          last_sign_in_at: authUser.last_sign_in_at
        });
      }

      setConnectionStatus('connected');
    } catch (err) {
      console.error('Error fetching staff profile:', err);
      
      // Set connection status based on error type
      if (err.message?.includes('network') || err.code === 'NETWORK_ERROR') {
        setConnectionStatus('disconnected');
      } else {
        setConnectionStatus('degraded');
      }
      
      // Fallback to basic user data from auth
      setUser({
        id: authUser.id,
        uid: authUser.id, // Add uid for Header component
        email: authUser.email,
        role: authUser.user_metadata?.role || 'Staff',
        first_name: authUser.user_metadata?.first_name || 'Unknown',
        last_name: authUser.user_metadata?.last_name || 'User',
        status: 'Active',
        access_level: 1,
        is_active: true,
        profile_image_url: null,
        profile_image_path: null,
        last_sign_in_at: authUser.last_sign_in_at
      });
    }
  };

  // Single auth initialization - rely ONLY on onAuthStateChange
  useEffect(() => {
    // Prevent multiple initializations
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;

    // Set up the auth state listener - this handles EVERYTHING
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        
        // Ignore certain auth events during password updates to prevent interference
        if (isUpdatingPassword && (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED')) {
          console.log('Ignoring auth state change during password update:', event);
          return;
        }
        
        // Always update session state first
        setSession(currentSession);
        
        switch (event) {
          case 'INITIAL_SESSION':
            // This handles both fresh page loads AND returning from inactive tabs
            if (currentSession) {
              try {
                await fetchStaffProfile(currentSession.user);
                setConnectionStatus('connected');
              } catch (error) {
                setConnectionStatus('degraded');
              }
            } else {
              setUser(null);
            }
            setLoading(false);
            break;

          case 'SIGNED_IN':
            if (!loading) {
              try {
                await fetchStaffProfile(currentSession.user);
                setConnectionStatus('connected');
                // Mark this as a new login for changelog tracking
                markNewLogin(currentSession.user.id);
                // Update last_login_at in staff table
                await supabase
                  .from('staff')
                  .update({ last_login_at: new Date().toISOString() })
                  .eq('user_id', currentSession.user.id);
                toast.success('Successfully signed in!');
              } catch (error) {
                setConnectionStatus('degraded');
              }
            }
            break;

          case 'SIGNED_OUT':
            setUser(null);
            setSession(null);
            setConnectionStatus('connected');
            setLoading(false);
            break;

          case 'USER_UPDATED':
            if (currentSession) {
              try {
                await fetchStaffProfile(currentSession.user);
              } catch (error) {
                // Silent error handling
              }
            }
            break;

          case 'TOKEN_REFRESHED':
            setConnectionStatus('connected');
            break;

          default:
            // Unhandled auth event
        }
      }
    );

    // Cleanup function
    return () => {
      subscription.unsubscribe();
      initializedRef.current = false;
    };
  }, [isUpdatingPassword]); // Add dependency on isUpdatingPassword

  // Login function
  const login = async (email, password, remember = false) => {
    try {
      
      if (!email || !password) {
        return {
          success: false,
          error: 'Email and password are required'
        };
      }

      // Check for internet connectivity first
      try {
        const networkTest = await fetch('https://www.google.com', { 
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store'
        });
      } catch (networkError) {
        return {
          success: false,
          error: 'Unable to connect to the internet. Please check your network connection.'
        };
      }

      // Proceed with login attempt
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          persistSession: remember
        }
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Failed to sign in. Please check your credentials.'
        };
      }
      
      // Wait for profile fetch to complete before returning success
      if (data.user) {
        try {
          await fetchStaffProfile(data.user);
          setConnectionStatus('connected');
          
          return { 
            success: true,
            redirectTo: '/dashboard'
          };
        } catch (profileError) {
          return {
            success: false,
            error: 'Failed to load user profile. Please try again.'
          };
        }
      }
      
      return {
        success: false,
        error: 'No user data received'
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message || 'Failed to sign in. Please check your credentials.'
      };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Clear changelog session data before logout
      if (user?.id) {
        clearChangelogSession(user.id);
      }
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.warn('Logout API error:', error);
        toast.warning('Logged out with some errors. You may need to clear browser data.');
      } else {
        toast.success('Logged out successfully');
      }
      
      // Get the correct base path based on environment
      const basePath = import.meta.env.DEV ? '/nextgen' : '';
      
      // Use the base path for redirection
      window.location.href = `${basePath}/login`;
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to complete logout properly');
      
      // Force clear state anyway for better UX
      setUser(null);
      setSession(null);
      
      // Also use base path here for error case
      const basePath = import.meta.env.DEV ? '/nextgen' : '';
      window.location.href = `${basePath}/login`;
    }
  };

  // Connection status toast notifications
  useEffect(() => {
    if (connectionStatus === 'disconnected' && user) {
      toast.error(
        'Connection to server lost. Please check your internet connection.', 
        { 
          duration: 8000,
          id: 'connection-lost'
        }
      );
    }
    
    if (connectionStatus === 'connected' && user) {
      toast.dismiss('connection-lost');
    }
  }, [connectionStatus, user]);

  // Function to refresh user data from database
  const refreshUser = async () => {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        return false;
      }

      // Fetch fresh data from staff table
      await fetchStaffProfile(authUser);
      return true;
    } catch (error) {
      console.error('Error refreshing user:', error);
      return false;
    }
  };

  // RBAC helper functions
  const hasPermission = (requiredLevel) => {
    if (!user) return false;
    const userLevel = user.access_level || 1;
    return userLevel >= requiredLevel;
  };

  const canView = (page) => {
    // Define page permissions (minimum access level required)
    const permissions = {
      dashboard: 1,           // Volunteer+
      staff_assignments: 1,   // Volunteer+
      children: 3,            // Team Leader+
      guardians: 3,           // Team Leader+
      attendance: 3,          // Team Leader+
      reports: 5,             // Coordinator+
      staff_management: 10,   // Admin only
      settings: 10,           // Admin only
      email: 5,               // Coordinator+
      materials: 5,           // Coordinator+
    };
    
    const requiredLevel = permissions[page] || 10; // Default to admin-only
    return hasPermission(requiredLevel);
  };

  // Context value
  const value = {
    user,
    staffProfile: user, // Add this line - staffProfile is an alias for user
    session,
    loading,
    login,
    logout,
    refreshUser, // Add refreshUser function
    isAuthenticated: !!session,
    connectionStatus,
    hasPermission,
    canView,
    setIsUpdatingPassword, // Export this so ProfileSettingsModal can use it
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Export the hook
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}