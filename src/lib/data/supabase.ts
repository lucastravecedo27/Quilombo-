import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'http://localhost:54321';
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || 'sin-configurar';

// Solo la anon key: toda la seguridad la ponen RLS y las funciones security definer del servidor.
export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'q-auth' }
});
