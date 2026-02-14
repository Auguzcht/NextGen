import { createClient } from '@supabase/supabase-js';

// Handle both Vite and Node.js environments
const getEnv = (key) => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key];
  }
  return undefined;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');
const supabaseServiceKey = getEnv('VITE_SUPABASE_SERVICE_KEY');

// Use global variables to ensure singleton instances
let _supabase = null;
let _supabaseAdmin = null;

// Custom storage adapter that respects "remember me" preference
const customStorage = {
  getItem: (key) => {
    // Check sessionStorage first (for non-remember sessions), then localStorage
    return sessionStorage.getItem(key) || localStorage.getItem(key);
  },
  setItem: (key, value) => {
    // Check if we should use sessionStorage (remember me = false)
    const rememberMe = sessionStorage.getItem('auth-remember-me') === 'true' || 
                      localStorage.getItem('auth-remember-me') === 'true';
    
    if (rememberMe) {
      localStorage.setItem(key, value);
      // Clean up sessionStorage to avoid conflicts
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, value);
      // Clean up localStorage to avoid conflicts
      localStorage.removeItem(key);
    }
  },
  removeItem: (key) => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  }
};

// Regular client for most operations (limited by RLS)
const getSupabase = () => {
  if (!_supabase) {
    _supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        storage: customStorage
      }
    });
  }
  return _supabase;
};

// Admin client for operations that need to bypass RLS
const getSupabaseAdmin = () => {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  }
  return _supabaseAdmin;
};

const supabase = getSupabase();
export const supabaseAdmin = getSupabaseAdmin();
export default supabase;