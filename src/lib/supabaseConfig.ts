/**
 * Облако по умолчанию: один проект Supabase для веба и iOS без обязательного .env.
 * Для другого окружения задайте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env — они имеют приоритет.
 * Anon key в клиенте допустим при корректных RLS-политиках в Supabase.
 */
const EMBEDDED_SUPABASE_URL = 'https://xceiikuoewdrnkxdnhiz.supabase.co';
const EMBEDDED_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjZWlpa3VvZXdkcm5reGRuaGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMjI2NzQsImV4cCI6MjA4OTg5ODY3NH0.ao8dWFrPV8pPLY_pnbC2fu_yBmHYRjVZwAUsK_WBIUQ';

export function resolveSupabaseUrl(): string {
  const fromEnv = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv;
  return EMBEDDED_SUPABASE_URL.trim();
}

export function resolveSupabaseAnonKey(): string {
  const fromEnv = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  if (fromEnv) return fromEnv;
  return EMBEDDED_SUPABASE_ANON_KEY.trim();
}

export function isSupabaseConfigured(): boolean {
  const url = resolveSupabaseUrl();
  const key = resolveSupabaseAnonKey();
  return Boolean(url && key);
}
