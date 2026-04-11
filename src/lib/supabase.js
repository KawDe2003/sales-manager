import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase project details from the dashboard
// Settings -> API
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project-url.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

if (!import.meta.env.VITE_SUPABASE_URL) {
  console.warn('[Supabase] VITE_SUPABASE_URL is not defined in environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
