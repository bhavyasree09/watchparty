import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// environment variables are injected by Vite at build time
// make sure to create a `.env` file at the project root containing
// VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see README below)

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // don't throw so that the whole app doesn't crash immediately;
  // the individual features will log errors when the client is used.
  console.warn(
    'Supabase environment variables are not set. Create `.env` with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

// create a client using empty strings if the values are missing so
// imports succeed without TypeScript complaining about possibly
// undefined arguments (the runtime warnings above will remind you).
export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  }
);
