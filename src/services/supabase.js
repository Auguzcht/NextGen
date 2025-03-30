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

// Regular client for most operations (limited by RLS)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for operations that need to bypass RLS (like user creation)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default supabase;