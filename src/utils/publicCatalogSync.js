import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'

// Mirrors a collection (currently just the services list) into the
// public_catalog table, which — unlike app_state — is readable by anyone
// holding the anon key. This is what lets the separate salon booking
// website show the current service list without needing a staff login.
// Fire-and-forget, same shape as saveAppState: never throws, never blocks
// the UI, and a failure here doesn't affect the app's own (already-saved)
// local/Supabase state.
export async function pushPublicCatalog(key, value) {
  if (!isSupabaseConfigured) return { ok: false, error: 'Supabase isn\u2019t configured (missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).' }
  try {
    const { error } = await supabase.from('public_catalog').upsert({ key, value }, { onConflict: 'key' })
    if (error) {
      console.error(`[supabase] failed to publish ${key} to public catalog:`, error.message)
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (err) {
    console.error(`[supabase] failed to publish ${key} to public catalog:`, err)
    return { ok: false, error: err?.message || 'Unknown error' }
  }
}
