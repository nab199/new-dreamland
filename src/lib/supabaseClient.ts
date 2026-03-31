import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Type for the client that can be null
let supabase: SupabaseClient | null = null;

/**
 * Get or create Supabase client instance
 * Returns null if not configured (allows app to work without Supabase)
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
    return null;
  }

  if (!supabase) {
    try {
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          storage: window.localStorage,
          storageKey: 'dreamland_supabase_auth',
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
      console.log('✅ Supabase client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Supabase client:', error);
      return null;
    }
  }

  return supabase;
}

/**
 * Check if Supabase is configured and available
 */
export function isSupabaseAvailable(): boolean {
  return getSupabaseClient() !== null;
}

/**
 * Get auth session from Supabase
 */
export async function getSupabaseSession() {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data: { session }, error } = await client.auth.getSession();
    if (error) throw error;
    return session;
  } catch (error) {
    console.error('Error getting Supabase session:', error);
    return null;
  }
}

/**
 * Sign in with Supabase
 */
export async function supabaseSignIn(email: string, password: string) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured');
  }

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Sign up with Supabase
 */
export async function supabaseSignUp(email: string, password: string) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured');
  }

  const { data, error } = await client.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Sign out from Supabase
 */
export async function supabaseSignOut() {
  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client.auth.signOut();
  if (error) console.error('Error signing out:', error);
}

/**
 * Listen to auth changes
 */
export function onSupabaseAuthChange(callback: (event: string, session: any) => void) {
  const client = getSupabaseClient();
  if (!client) return () => {};

  const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return () => {
    subscription.unsubscribe();
  };
}

// Export the getter function as default
export default getSupabaseClient;
