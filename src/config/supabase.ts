import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireSupabaseEnv } from './env.js';

const authOptions = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
};

export function createPublicClient(): SupabaseClient {
  const env = requireSupabaseEnv();
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, authOptions);
}

export function createUserClient(accessToken: string): SupabaseClient {
  const env = requireSupabaseEnv();
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    ...authOptions,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

let serviceClient: SupabaseClient | undefined;

export function getServiceClient(): SupabaseClient {
  const env = requireSupabaseEnv();
  serviceClient ??= createClient(env.SUPABASE_URL, env.SUPABASE_SERVER_KEY, authOptions);
  return serviceClient;
}
