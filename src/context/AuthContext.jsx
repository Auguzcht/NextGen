import { createContext, useState, useEffect, useContext } from 'react';
import supabase from '../services/supabase.js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [staffProfile, setStaffProfile] = useState(null);

  console.log('AuthProvider state:', { user, loading, staffProfile });

  // Use a separate effect to ensure loading state gets updated
  useEffect(() => {
    // Force loading to false after a timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.log('Safety timeout triggered - forcing loading state to false');
        setLoading(false);
      }
    }, 5000); // 5 seconds max loading time
    
    return () => clearTimeout(safetyTimeout);
  }, [loading]);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      console.log('Initializing auth...');
      
      try {
        // Get the current session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Supabase session error:', error);
          if (mounted) setLoading(false);
          return;
        }
        
        console.log('Session data:', data?.session);
        
        if (mounted) {
          if (data?.session?.user) {
            // Check if session is too old (e.g., more than 8 hours)
            const sessionCreatedAt = new Date(data.session.created_at);
            const now = new Date();
            const hoursElapsed = (now - sessionCreatedAt) / (1000 * 60 * 60);
            
            if (hoursElapsed > 8) {
              // Force logout if session is too old
              await supabase.auth.signOut();
              setUser(null);
              setLoading(false);
              return;
            }
            
            setUser(data.session.user);
            try {
              await fetchStaffProfile(data.session.user);
            } catch (profileError) {
              console.error('Error fetching staff profile:', profileError);
            }
          } else {
            setUser(null);
          }
          
          // Important: Always set loading to false
          setLoading(false);
          console.log('Auth initialization complete - loading set to false');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
          console.log('Auth initialization failed - loading set to false anyway');
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
        
        if (session?.user) {
          setUser(session.user);
          try {
            await fetchStaffProfile(session.user);
          } catch (error) {
            console.error('Error fetching staff profile on auth change:', error);
          }
        } else {
          setUser(null);
          setStaffProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Function to fetch staff profile
  const fetchStaffProfile = async (user) => {
    if (!user?.id) {
      console.error('Cannot fetch profile - no user ID');
      setStaffProfile(null);
      return;
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
        return;
      }
      
      console.log('Staff profile loaded:', data);
      setStaffProfile(data);
    } catch (error) {
      console.error('Staff profile fetch error:', error);
      setStaffProfile(null);
    }
  };

  // Function to sign in users
  const signIn = async (email, password) => {
    try {
      console.log('Attempting sign in for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('Sign in error:', error);
        throw error;
      }
      
      console.log('Sign in successful:', data?.user?.id);
      return data;
    } catch (error) {
      console.error('Sign in exception:', error);
      throw error;
    }
  };

  // Function to sign out
  const signOut = async () => {
    try {
      console.log('Signing out user');
      
      // Clear local state
      setUser(null);
      setStaffProfile(null);
      
      // Also clear localStorage of any Supabase tokens
      // This is a safeguard in case the Supabase signOut doesn't fully clear everything
      localStorage.removeItem('supabase.auth.token');
      
      // Then call the API
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        throw error;
      }
      
      console.log('Sign out successful');
    } catch (error) {
      console.error('Sign out exception:', error);
      throw error;
    }
  };

  // Function to sign up users
  const signUp = async (email, password, userData) => {
    try {
      console.log('Attempting sign up for:', email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });
      
      if (error) {
        console.error('Sign up error:', error);
        throw error;
      }
      
      console.log('Sign up successful:', data?.user?.id);
      return data;
    } catch (error) {
      console.error('Sign up exception:', error);
      throw error;
    }
  };

  // Context value
  const value = {
    user,
    loading,
    staffProfile,
    signIn,
    signOut,
    signUp,
    fetchStaffProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}