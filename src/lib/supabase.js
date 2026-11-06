import { createClient } from '@supabase/supabase-js';

// These are public client-side values. Vercel environment variables take
// precedence; fallbacks keep the public app working if a deployment was built
// before the variables were attached to the Production environment.
const supabaseUrl = (
  import.meta.env.VITE_SUPABASE_URL || 'https://yjoszxczwmhztwzmaqhy.supabase.co'
).trim();

const supabaseAnonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlqb3N6eGN6d21oenR3em1hcWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3OTc1NTksImV4cCI6MjEwOTM3MzU1OX0.a6XF2goIgV_9wLv1mHfnoFEVyS0riQqmgI62ZnGCRus'
).trim();

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;
