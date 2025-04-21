import { createContext, useState, useEffect, useContext, useRef } from 'react';
import supabase from '../services/supabase.js';

// Create and export the context
export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [staffProfile, setStaffProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [loginRedirectInProgress, setLoginRedirectInProgress] = useState(false);
  const manualSignInInProgress = useRef(false);
  const authInitialized = useRef(false);
  const lastSignInAttempt = useRef(0);
  
  // Store session in ref to avoid triggering re-renders
  const sessionRef = useRef(null);

  // Function to fetch staff profile
  const fetchStaffProfile = async (user) => {
    if (!user?.id) {
      console.log('Cannot fetch profile - no user ID');
      setStaffProfile(null);
      return null;
    }
    
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.log('Staff profile query error:', error);
        setStaffProfile(null);
        return null;
      }
      
      console.log('Staff profile loaded:', data?.staff_id);
      setStaffProfile(data);
      return data;
    } catch (error) {
      console.log('Staff profile fetch error:', error);
      setStaffProfile(null);
      return null;
    }
  };

  // Initialize auth state - only once
  useEffect(() => {
    let mounted = true;
    let safetyTimeout;
    
    // Prevent double initialization
    if (authInitialized.current) {
      return;
    }
    
    authInitialized.current = true;
    
    const initializeAuth = async () => {
      console.log('Initializing auth...');
      
      try {
        // Set a longer safety timeout
        safetyTimeout = setTimeout(() => {
          if (mounted && loading) {
            console.warn('Safety timeout triggered - forcing loading state to false');
            setUser(null);
            setStaffProfile(null);
            setLoading(false);
            setInitialized(true);
          }
        }, 12000); // Extended to 12 seconds to ensure everything loads

        // Get the current session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.log('Supabase session error:', error);
          if (mounted) {
            resetAuthState();
          }
          return;
        }
        
        sessionRef.current = data.session;
        
        // If no active session, clear state
        if (!data.session) {
          console.log('No active session found');
          if (mounted) {
            resetAuthState();
          }
          return;
        }
        
        console.log('Session found:', data.session.user.id);
        
        // Valid session - set user and fetch profile
        if (mounted) {
          setUser(data.session.user);
          
          try {
            const profileData = await fetchStaffProfile(data.session.user);
            
            // If no staff profile exists for this user, log them out
            if (!profileData) {
              console.log('No staff profile found, forcing logout');
              
              // Use Promise timeout to avoid hanging
              await Promise.race([
                supabase.auth.signOut(),
                new Promise(resolve => setTimeout(resolve, 2000))
              ]);
              
              if (mounted) {
                resetAuthState();
              }
            } else {
              // Profile found, explicitly set loading to false
              if (mounted) {
                // CRITICAL: Force refresh here to ensure new state is recognized
                setLoading(false);
                setInitialized(true);
                console.log('Auth initialized with valid profile, setting loading to false');
                
                // Clear any manual sign-in flag that might be hanging
                manualSignInInProgress.current = false;
              }
            }
          } catch (profileError) {
            console.log('Error fetching staff profile:', profileError);
            resetAuthState();
          }
        }
      } catch (error) {
        console.log('Auth initialization error:', error);
        if (mounted) {
          resetAuthState();
        }
      } finally {
        // Clear the safety timeout since we've completed initialization
        if (safetyTimeout) {
          clearTimeout(safetyTimeout);
        }
      }
    };

    // Initialize auth with a small delay to avoid race conditions
    // This helps resolve the multiple client instances issue
    setTimeout(() => {
      initializeAuth();
    }, 100);

    // Helper function to reset auth state
    const resetAuthState = () => {
      setUser(null);
      setStaffProfile(null);
      setLoading(false);
      setInitialized(true);
      sessionRef.current = null;
      manualSignInInProgress.current = false;
      setLoginRedirectInProgress(false);
    };

    // Set up auth state listener with debouncing to prevent rapid state changes
    let debounceTimer = null;
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (!mounted) return;
        
        // Clear any pending debounce
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        
        // Debounce auth state changes to prevent race conditions
        debounceTimer = setTimeout(async () => {
          if (!mounted) return;
          
          if (event === 'SIGNED_OUT') {
            console.log('User signed out');
            resetAuthState();
            return;
          }
          
          if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
            console.log('User session updated:', session.user.id);
            
            // Update session ref
            sessionRef.current = session;
            
            // CRITICAL: Detect and handle duplicate sign-in events
            const now = Date.now();
            const isDuplicate = (now - lastSignInAttempt.current) < 5000; // Within 5 seconds
            lastSignInAttempt.current = now;
            
            // Handle user's manual sign-in
            if (manualSignInInProgress.current) {
              console.log('Manual sign-in in progress, handling session');
              
              // Always set the user to keep context in sync
              setUser(session.user);
              
              try {
                await fetchStaffProfile(session.user);
                // Ensure loading state is false after successful profile fetch
                setLoading(false);
                setInitialized(true);
                
                // Clear the manual sign-in flag AFTER successful setup
                // Use timeout to ensure state updates first
                setTimeout(() => {
                  manualSignInInProgress.current = false;
                }, 500);
              } catch (error) {
                console.log('Error fetching profile after manual sign in:', error);
                resetAuthState();
              }
              return;
            }
            
            // For automatic sign-ins (like page refresh), proceed normally
            if (!isDuplicate) {
              setUser(session.user);
              
              try {
                await fetchStaffProfile(session.user);
              } catch (error) {
                console.log('Error fetching profile after sign in:', error);
              } finally {
                setLoading(false);
                setInitialized(true);
              }
            } else {
              console.log('Detected duplicate auth event, ignoring');
            }
          } else if (session?.user) {
            console.log('Session user updated:', session.user.id);
            
            // Update session ref
            sessionRef.current = session;
            setUser(session.user);
            
            try {
              await fetchStaffProfile(session.user);
            } catch (error) {
              console.log('Error fetching profile for session user:', error);
            } finally {
              setLoading(false);
              setInitialized(true);
            }
          } else if (event === 'USER_UPDATED') {
            // Just update initialized state
            setLoading(false);
            setInitialized(true);
          }
        }, 50); // Shorter debounce time for more responsiveness
      }
    );

    // Set up session refresh with more aggressive timing
    const setupSessionRefresh = () => {
      // First do an immediate refresh
      refreshSessionSilently();
      
      const refreshInterval = setInterval(async () => {
        refreshSessionSilently();
      }, 1 * 60 * 1000); // Refresh every 1 minute (more frequent)
      
      return refreshInterval;
    };
    
    // Helper function for silent session refresh
    const refreshSessionSilently = async () => {
      try {
        // Only refresh if we have a session
        if (sessionRef.current) {
          console.log('Refreshing session token...');
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.log('Session refresh error:', error);
            // If refresh fails, try to handle gracefully
            if (error.message.includes('expired') || error.message.includes('invalid')) {
              resetAuthState();
            }
          } else if (data?.session) {
            // Update the session reference with the fresh session
            sessionRef.current = data.session;
            
            // If user isn't set but we have a session, update the user
            if (!user && data.session.user) {
              setUser(data.session.user);
              fetchStaffProfile(data.session.user).finally(() => {
                setLoading(false);
                setInitialized(true);
              });
            }
          }
        }
      } catch (error) {
        console.log('Error refreshing session:', error);
      }
    };
    
    // Start session refresh
    const refreshInterval = setupSessionRefresh();

    return () => {
      mounted = false;
      
      // Clear timers on unmount
      if (safetyTimeout) clearTimeout(safetyTimeout);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (refreshInterval) clearInterval(refreshInterval);
      
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []); // Empty dependency array - we only want to run this once

  // Function to sign in users with improved error handling and state management
  const signIn = async (email, password, rememberMe = true) => {
    try {
      console.log('Sign in attempt for:', email);
      setLoading(true);
      manualSignInInProgress.current = true;
      lastSignInAttempt.current = Date.now();
      
      // Clear first - this helps with the stuck login issue
      setUser(null);
      setStaffProfile(null);
      
      // Clear session and local storage first for clean state
      localStorage.clear(); 
      sessionStorage.clear();
      
      // Reset flags
      setLoginRedirectInProgress(false);
      
      // Force sign out before signing in to ensure clean state
      try {
        await Promise.race([
          supabase.auth.signOut(),
          new Promise(resolve => setTimeout(resolve, 2000))
        ]);
      } catch (signOutError) {
        console.log('Error during pre-signin signout:', signOutError);
        // Continue anyway
      }
      
      // Short delay to ensure signout completes and storage is cleared
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Always use persistSession for better UX
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          persistSession: true
        }
      });
      
      if (error) {
        console.log('Sign in error:', error);
        setUser(null);
        setStaffProfile(null);
        manualSignInInProgress.current = false;
        throw error;
      }
      
      console.log('Sign in successful:', data?.user?.id);
      
      // Update session ref
      sessionRef.current = data.session;
      
      // Load staff profile
      if (data.user) {
        try {
          const profileData = await fetchStaffProfile(data.user);
          
          // If no staff profile exists for this user, throw error
          if (!profileData) {
            console.log('No staff profile found for user');
            await supabase.auth.signOut();
            setUser(null);
            setStaffProfile(null);
            manualSignInInProgress.current = false;
            throw new Error('No staff profile found for this account. Please contact your administrator.');
          }
          
          // Set user and profile state after successful login
          setUser(data.user);
          setStaffProfile(profileData);
          
          // Explicitly set loading to false to prevent infinite loading screen
          setLoading(false);
          setInitialized(true);
          
          return data;
        } catch (profileError) {
          console.log('Error fetching staff profile after login:', profileError);
          await supabase.auth.signOut();
          setUser(null);
          setStaffProfile(null);
          manualSignInInProgress.current = false;
          throw new Error('Error loading staff profile. Please try again.');
        }
      }
      
      return data;
    } catch (error) {
      console.log('Sign in exception:', error);
      setUser(null);
      setStaffProfile(null);
      setLoading(false);
      setLoginRedirectInProgress(false);
      manualSignInInProgress.current = false;
      setInitialized(true);
      throw error;
    }
  };

  // Function to sign out with improved cleanup
  const signOut = async () => {
    try {
      console.log('Signing out user');
      setLoading(true);
      
      // Clear local state first
      setUser(null);
      setStaffProfile(null);
      sessionRef.current = null;
      manualSignInInProgress.current = false;
      
      // Clear all local storage and session storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear cookies related to auth
      document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.trim().split('=');
        if (name.includes('sb-') || name.includes('supabase')) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
        }
      });

      // Call the API to sign out with a timeout
      try {
        await Promise.race([
          supabase.auth.signOut(),
          new Promise(resolve => setTimeout(resolve, 2000))
        ]);
        console.log('Sign out API call successful');
      } catch (error) {
        console.log('Sign out API call error:', error);
      }
      
      console.log('Sign out process completed');
      window.location.href = '/nextgen/login'; // Force hard navigation to login page
      return true;
    } catch (error) {
      console.log('Sign out exception:', error);
      throw error;
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  // Function to refresh the session with better handling
  const refreshSession = async () => {
    try {
      console.log('Manually refreshing session...');
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.log('Session refresh error:', error);
        if (error.message.includes('expired') || error.message.includes('invalid')) {
          // Session is invalid, reset auth state
          resetAuthState();
        }
        return false;
      }
      
      if (data?.session) {
        // Update the session reference
        sessionRef.current = data.session;
        
        // Also update the user object if it exists
        if (data.session.user && (!user || user.id !== data.session.user.id)) {
          setUser(data.session.user);
          await fetchStaffProfile(data.session.user);
          setLoading(false);
          setInitialized(true);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.log('Session refresh exception:', error);
      return false;
    }
  };

  // Helper function to reset auth state
  const resetAuthState = () => {
    setUser(null);
    setStaffProfile(null);
    setLoading(false);
    setInitialized(true);
    sessionRef.current = null;
    manualSignInInProgress.current = false;
    setLoginRedirectInProgress(false);
  };

  // Improve the clearLoginFlags function to be more robust
  const clearLoginFlags = () => {
    console.log('Clearing login flags');
    setLoginRedirectInProgress(false);
    
    // Use a timeout to ensure other state updates have completed
    setTimeout(() => {
      manualSignInInProgress.current = false;
    }, 300);
    
    console.log('Login flags cleared');
  };

  // Handle browser refresh or tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Send a beacon to refresh the session
      if (sessionRef.current) {
        // This is just to ensure the session persists across refreshes
        navigator.sendBeacon(`${window.location.origin}/nextgen/api/refresh-session`);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Force refresh when stalled
  useEffect(() => {
    // If we detect we're in a loading state for too long and have a session
    // but no user, force a session refresh
    if (loading && !user && sessionRef.current) {
      const stalledTimer = setTimeout(() => {
        console.log('Detected stalled loading state with session but no user, forcing refresh');
        refreshSession().then(success => {
          if (!success) {
            console.log('Failed to refresh session, resetting auth state');
            resetAuthState();
          }
        });
      }, 5000);
      
      return () => clearTimeout(stalledTimer);
    }
  }, [loading, user]);

  // Context value
  const value = {
    user,
    loading: loading || !initialized,
    staffProfile,
    signIn,
    signOut,
    fetchStaffProfile,
    initialized,
    loginRedirectInProgress,
    setLoginRedirectInProgress,
    clearLoginFlags,
    refreshSession,
    resetAuthState
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Export the hook
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}