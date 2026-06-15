import { createClient } from '@supabase/supabase-js';

// As variáveis de ambiente estão agora configuradas no ficheiro .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);