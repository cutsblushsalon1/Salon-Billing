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

// Fetches ONE collection fresh from Supabase, bypassing whatever this
// device already has in memory. Used right before a write that must not
// clobber changes made from another tab/device (see mergeSaveAppState
// below) - the one-time pull in fetchAppState() only reflects the state of
// the world at page load, which can be stale by the time the user acts.
export async function fetchAppStateKey(key) {
  if (!isSupabaseConfigured) return undefined
  try {
    const { data, error } = await supabase.from('app_state').select('value').eq('key', key).maybeSingle()
    if (error) throw error
    return data ? data.value : undefined
  } catch (err) {
    console.error(`[supabase] failed to load ${key}:`, err)
    return undefined
  }
}

// Fire-and-forget upsert of one collection, keyed by its STORAGE_KEYS name.
// Never throws and never blocks the UI - localStorage is still the source
// of truth on this device if the push fails.
//
// IMPORTANT: this REPLACES the entire row for `key` with `value`. It's only
// safe to call with a value that was built from a fresh fetchAppStateKey()
// read (or a value the user explicitly intends as a full overwrite, like a
// backup restore). Calling it with a collection that was only ever loaded
// once at page-mount time is how bills silently vanish: two devices each
// hold their own stale in-memory copy, and whichever one saves last wins,
// erasing anything the other created in between. See createBill/updateBill/
// deleteBill in AppContext.jsx for the merge-before-write pattern.
export async function saveAppState(key, value) {
  if (!isSupabaseConfigured) return
  try {
    const { error } = await supabase.from('app_state').upsert({ key, value }, { onConflict: 'key' })
    if (error) console.error(`[supabase] failed to sync ${key}:`, error.message)
  } catch (err) {
    console.error(`[supabase] failed to sync ${key}:`, err)
  }
}
