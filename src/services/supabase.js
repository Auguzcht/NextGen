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

// Regular client for most operations (limited by RLS)
const getSupabase = () => {
  if (!_supabase) {
    _supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true
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