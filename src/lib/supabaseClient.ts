import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured, resolveSupabaseAnonKey, resolveSupabaseUrl } from './supabaseConfig';

export { isSupabaseConfigured } from './supabaseConfig';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase URL и ключ не заданы (ни в .env, ни встроенные в supabaseConfig.ts)');
  }
  if (!client) {
    client = createClient(resolveSupabaseUrl(), resolveSupabaseAnonKey());
  }
  return client;
}
