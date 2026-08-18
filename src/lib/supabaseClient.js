import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  // Login (Supabase Auth) and all data sync depend on this being configured -
  // without it the app can't do much. Warn loudly, but still avoid crashing
  // the whole page: createClient() throws synchronously if either argument
  // is missing, so fall back to harmless placeholder values. Every call this
  // client makes will then fail at request time instead, which the
  // try/catches around it (and the isSupabaseConfigured checks in
  // AppContext/appStateSync) already handle gracefully.
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing. ' +
      'Add them to a .env file at the project root, then restart `npm run dev`.',
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
)
