import { createContext, useState, useEffect, useContext, useRef } from 'react';
import { toast } from 'react-hot-toast';
import supabase from '../services/supabase';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const initializedRef = useRef(false);

  // Fetch staff profile from staff table
  const fetchStaffProfile = async (authUser) => {
    if (!authUser) {
      setUser(null);
      return;
    }
    
    try {
      console.log('Fetching staff profile for:', authUser.id);
      
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', authUser.id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }
      
      if (!data) {
        console.warn('No staff record found for user:', authUser.id);
        
        // Create fallback user object with ministry-specific roles
        const fallbackUser = { 
          id: authUser.id,
          email: authUser.email,
          role: authUser.user_metadata?.role || 'Staff',
          first_name: authUser.user_metadata?.first_name || 'Unknown',
          last_name: authUser.user_metadata?.last_name || 'User',
          status: 'Active'
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
            console.log('Created missing staff record for user:', authUser.id);
          }
        } catch (createErr) {
          console.error('Failed to create staff record:', createErr);
        }
      } else {
        // Map staff record to user object with ministry-specific fields
        setUser({
          id: authUser.id,
          email: authUser.email,
          first_name: data.first_name || authUser.user_metadata?.first_name,
          last_name: data.last_name || authUser.user_metadata?.last_name,
          role: data.role || authUser.user_metadata?.role || 'Staff',
          status: data.status || 'Active',
          access_level: data.access_level || 1,
          staff_id: data.staff_id
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
        email: authUser.email,
        role: authUser.user_metadata?.role || 'Staff',
        first_name: authUser.user_metadata?.first_name || 'Unknown',
        last_name: authUser.user_metadata?.last_name || 'User',
        status: 'Active',
        access_level: 1
      });
    }
  };

  // Single auth initialization - rely ONLY on onAuthStateChange
  useEffect(() => {
    // Prevent multiple initializations
    if (initializedRef.current) {
      console.log('Auth already initialized, skipping...');
      return;
    }

    console.log('Initializing auth listener...');
    initializedRef.current = true;

    // Set up the auth state listener - this handles EVERYTHING
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state changed:', event, currentSession?.user?.email || 'No session');
        
        // Always update session state first
        setSession(currentSession);
        
        switch (event) {
          case 'INITIAL_SESSION':
            // This handles both fresh page loads AND returning from inactive tabs
            if (currentSession) {
              console.log('Initial session found, fetching user profile');
              try {
                await fetchStaffProfile(currentSession.user);
                setConnectionStatus('connected');
              } catch (error) {
                console.error('Error during initial profile fetch:', error);
                setConnectionStatus('degraded');
              }
            } else {
              console.log('No initial session found');
              setUser(null);
            }
            setLoading(false);
            break;

          case 'SIGNED_IN':
            console.log('User signed in');
            if (!loading) {
              try {
                await fetchStaffProfile(currentSession.user);
                setConnectionStatus('connected');
                toast.success('Successfully signed in!');
              } catch (error) {
                console.error('Error during sign-in profile fetch:', error);
                setConnectionStatus('degraded');
              }
            }
            break;

          case 'SIGNED_OUT':
            console.log('User signed out');
            setUser(null);
            setSession(null);
            setConnectionStatus('connected');
            setLoading(false);
            break;

          case 'USER_UPDATED':
            console.log('User updated');
            if (currentSession) {
              try {
                await fetchStaffProfile(currentSession.user);
              } catch (error) {
                console.error('Error during user update profile fetch:', error);
              }
            }
            break;

          case 'TOKEN_REFRESHED':
            console.log('Token refreshed successfully');
            setConnectionStatus('connected');
            break;

          default:
            console.log('Unhandled auth event:', event);
        }
      }
    );

    // Cleanup function
    return () => {
      console.log('Cleaning up auth listener');
      subscription.unsubscribe();
      initializedRef.current = false;
    };
  }, []); // Empty dependency array - initialize once and only once

  // Login function
  const login = async (email, password, remember = true) => {
    try {
      console.log('Attempting login for:', email);
      
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
        console.log('Network connectivity check passed');
      } catch (networkError) {
        console.error('Network connectivity issue detected:', networkError);
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
        console.error('Login error details:', error);
        return {
          success: false,
          error: error.message || 'Failed to sign in. Please check your credentials.'
        };
      }

      console.log('Login successful for:', email);
      
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
          console.error('Profile fetch error:', profileError);
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
      console.log('Logging out user');
      
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

  // Context value
  const value = {
    user,
    session,
    loading,
    login,
    logout,
    isAuthenticated: !!session,
    connectionStatus,
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