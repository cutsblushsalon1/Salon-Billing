import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Doesn't throw - the rest of the app (local billing) still works without
  // Supabase. Only invoice-link sharing needs these.
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing. ' +
      'Add them to a .env file at the project root, then restart `npm run dev`.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
