import { supabase, isSupabaseConfigured } from './supabaseClient.js'

// Same collections AppContext keeps in localStorage (see STORAGE_KEYS).
// Login/session state isn't part of this list at all - that's handled by
// supabase.auth directly (a real account), not by anything in this table.
export const SYNC_KEYS = [
  'clients',
  'services',
  'products',
  'staff',
  'attendance',
  'templates',
  'followUps',
  'bills',
  'settings',
  'membershipPlans',
  'clientMemberships',
]

// Fetches every synced collection in one query. Returns {} if Supabase isn't
// configured or the request fails - callers just keep whatever they already
// loaded from localStorage/seed data.
export async function fetchAppState() {
  if (!isSupabaseConfigured) return {}
  try {
    const { data, error } = await supabase.from('app_state').select('key, value').in('key', SYNC_KEYS)
    if (error) throw error
    return Object.fromEntries(data.map((row) => [row.key, row.value]))
  } catch (err) {
    console.error('[supabase] failed to load app state:', err)
    return {}
  }
}

// Fire-and-forget upsert of one collection, keyed by its STORAGE_KEYS name.
// Never throws and never blocks the UI - localStorage is still the source
// of truth on this device if the push fails.
export async function saveAppState(key, value) {
  if (!isSupabaseConfigured) return
  try {
    const { error } = await supabase.from('app_state').upsert({ key, value }, { onConflict: 'key' })
    if (error) console.error(`[supabase] failed to sync ${key}:`, error.message)
  } catch (err) {
    console.error(`[supabase] failed to sync ${key}:`, err)
  }
}
