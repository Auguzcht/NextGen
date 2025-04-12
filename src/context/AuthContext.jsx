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

  // Function to fetch staff profile
  const fetchStaffProfile = async (user) => {
    if (!user?.id) {
      console.error('Cannot fetch profile - no user ID');
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
        console.error('Staff profile query error:', error);
        setStaffProfile(null);
        return null;
      }
      
      console.log('Staff profile loaded:', data);
      setStaffProfile(data);
      return data;
    } catch (error) {
      console.error('Staff profile fetch error:', error);
      setStaffProfile(null);
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    let safetyTimeout;
    
    const initializeAuth = async () => {
      console.log('Initializing auth...');
      
      try {
        // Set a safety timeout to prevent infinite loading
        safetyTimeout = setTimeout(() => {
          if (mounted && loading) {
            console.warn('Safety timeout triggered - forcing loading state to false');
            setUser(null);
            setStaffProfile(null);
            setLoading(false);
            setInitialized(true);
          }
        }, 5000); // 5 second timeout

        // Get the current session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Supabase session error:', error);
          if (mounted) {
            setUser(null);
            setStaffProfile(null);
            setLoading(false);
            setInitialized(true);
          }
          return;
        }
        
        // If no active session, clear state
        if (!data.session) {
          console.log('No active session found');
          if (mounted) {
            setUser(null);
            setStaffProfile(null);
            setLoading(false);
            setInitialized(true);
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
              await supabase.auth.signOut();
              if (mounted) {
                setUser(null);
                setStaffProfile(null);
              }
            }
          } catch (profileError) {
            console.error('Error fetching staff profile:', profileError);
          } finally {
            // Always update these states regardless of the outcome
            if (mounted) {
              setLoading(false);
              setInitialized(true);
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setUser(null);
          setStaffProfile(null);
          setLoading(false);
          setInitialized(true);
        }
      } finally {
        // Clear the safety timeout since we've completed initialization
        if (safetyTimeout) {
          clearTimeout(safetyTimeout);
        }
      }
    };

    // Initialize auth
    initializeAuth();

    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (!mounted) return;
        
        if (event === 'SIGNED_OUT') {
          if (mounted) {
            setUser(null);
            setStaffProfile(null);
            setLoading(false);
            setInitialized(true);
          }
          return;
        }
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in:', session.user.id);
          
          // CRITICAL: Skip automatic redirect if this is a manual sign-in
          // This prevents the double redirect
          if (manualSignInInProgress.current) {
            console.log('Manual sign-in in progress, skipping automatic session handling');
            // Still set the user to keep context in sync
            if (mounted) {
              setUser(session.user);
              
              try {
                await fetchStaffProfile(session.user);
              } catch (error) {
                console.error('Error fetching profile after manual sign in:', error);
              } finally {
                setLoading(false);
                setInitialized(true);
              }
            }
            return;
          }
          
          // For automatic sign-ins (like page refresh), proceed normally
          if (mounted) {
            setUser(session.user);
            
            try {
              await fetchStaffProfile(session.user);
            } catch (error) {
              console.error('Error fetching profile after sign in:', error);
            } finally {
              setLoading(false);
              setInitialized(true);
            }
          }
        } else if (session?.user) {
          if (mounted) {
            setUser(session.user);
            
            try {
              await fetchStaffProfile(session.user);
            } catch (error) {
              console.error('Error fetching profile for session user:', error);
            } finally {
              setLoading(false);
              setInitialized(true);
            }
          }
        } else {
          if (mounted) {
            setUser(null);
            setStaffProfile(null);
            setLoading(false);
            setInitialized(true);
          }
        }
      }
    );

    return () => {
      mounted = false;
      // Clear safety timeout on unmount
      if (safetyTimeout) {
        clearTimeout(safetyTimeout);
      }
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Function to sign in users
  const signIn = async (email, password, rememberMe) => {
    try {
      setLoading(true);
      // Set the flag to indicate a manual sign-in is in progress
      manualSignInInProgress.current = true;
      
      // First clear any existing tokens and sessions
      localStorage.clear(); 
      
      // Explicitly reset redirection state
      setLoginRedirectInProgress(false);
      
      // Explicitly sign out before signing in
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error('Error during pre-signin signout:', signOutError);
        // Continue anyway
      }
      
      // Add a short delay to ensure signout completes
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('Sign in error:', error);
        setUser(null);
        setStaffProfile(null);
        manualSignInInProgress.current = false;
        throw error;
      }
      
      console.log('Sign in successful:', data?.user?.id);
      
      // Load staff profile
      if (data.user) {
        try {
          const profileData = await fetchStaffProfile(data.user);
          
          // If no staff profile exists for this user, throw error
          if (!profileData) {
            console.error('No staff profile found for user');
            await supabase.auth.signOut();
            setUser(null);
            setStaffProfile(null);
            manualSignInInProgress.current = false;
            throw new Error('No staff profile found for this account. Please contact your administrator.');
          }
          
          // Set user and profile state after successful login
          setUser(data.user);
          setStaffProfile(profileData);
          
          // Keep loading false so PublicRoute doesn't show loading screen
          setLoading(false);
          
          return data;
        } catch (profileError) {
          console.error('Error fetching staff profile after login:', profileError);
          await supabase.auth.signOut();
          setUser(null);
          setStaffProfile(null);
          manualSignInInProgress.current = false;
          throw new Error('Error loading staff profile. Please try again.');
        }
      }
      
      return data;
    } catch (error) {
      console.error('Sign in exception:', error);
      setUser(null);
      setStaffProfile(null);
      setLoading(false);
      setLoginRedirectInProgress(false);
      manualSignInInProgress.current = false;
      throw error;
    } finally {
      setInitialized(true);
      // Note: we don't reset manualSignInInProgress.current here
      // It will be cleared when LoginForm completes its redirect
    }
  };

  // Function to sign out
  const signOut = async () => {
    try {
      console.log('Signing out user');
      setLoading(true);
      
      // Clear local state first
      setUser(null);
      setStaffProfile(null);
      
      // Clear all localStorage
      localStorage.clear();
      
      // Clear cookies related to auth (if any)
      document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.trim().split('=');
        if (name.includes('sb-') || name.includes('supabase')) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
        }
      });

      // Then call the API to sign out
      try {
        await supabase.auth.signOut();
        console.log('Sign out API call successful');
      } catch (error) {
        console.error('Sign out API call error:', error);
        // Continue with the process even if API call fails
      }
      
      console.log('Sign out process completed');
      
      // Use a standard navigation instead of setting window.location directly
      return true;
    } catch (error) {
      console.error('Sign out exception:', error);
      throw error;
    } finally {
      setLoading(false);
      manualSignInInProgress.current = false;
    }
  };

  // Improve the clearLoginFlags function to be more robust
  const clearLoginFlags = () => {
    console.log('Clearing login flags');
    
    // Use setTimeout to ensure this happens after the current execution cycle
    setTimeout(() => {
      setLoginRedirectInProgress(false);
      manualSignInInProgress.current = false;
      console.log('Login flags cleared');
    }, 0);
  };

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
    clearLoginFlags // Make sure this is here
  };

  console.log('AuthProvider state:', value);

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