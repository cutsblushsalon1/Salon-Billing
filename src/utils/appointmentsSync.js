import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'

// Appointments are booked on the salon's separate public website, which
// inserts rows directly into this Supabase table using the same project's
// anon key. This billing app only reads/updates/deletes — it never inserts
// a booking on the customer's behalf (that happens on the booking site).

export async function fetchAppointments() {
  if (!isSupabaseConfigured) return []
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .order('appointment_date', { ascending: true })
    if (error) throw error
    return data || []
  } catch (err) {
    console.error('[supabase] failed to load appointments:', err)
    return []
  }
}

export async function updateAppointmentStatus(id, status) {
  if (!isSupabaseConfigured) return
  try {
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id)
    if (error) console.error('[supabase] failed to update appointment:', error.message)
  } catch (err) {
    console.error('[supabase] failed to update appointment:', err)
  }
}

export async function deleteAppointmentRemote(id) {
  if (!isSupabaseConfigured) return
  try {
    const { error } = await supabase.from('appointments').delete().eq('id', id)
    if (error) console.error('[supabase] failed to delete appointment:', error.message)
  } catch (err) {
    console.error('[supabase] failed to delete appointment:', err)
  }
}

// Subscribes to live inserts/updates/deletes on the appointments table, so a
// booking made on the public website appears here within moments, with no
// page refresh needed. Returns an unsubscribe function; safe to call even
// when Supabase isn't configured (returns a no-op).
export function subscribeToAppointments(onChange) {
  if (!isSupabaseConfigured) return () => {}
  const channel = supabase
    .channel('appointments-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, onChange)
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// Records that the confirmation WhatsApp went out. Separate from the status
// update on purpose: if the `confirmation_sent_at` column hasn't been added
// yet (supabase/appointment_messages.sql), only this call fails - the
// confirm itself still works.
export async function markConfirmationSent(id) {
  if (!isSupabaseConfigured) return
  try {
    const { error } = await supabase
      .from('appointments')
      .update({ confirmation_sent_at: new Date().toISOString() })
      .eq('id', id)
    if (error) console.warn('[supabase] could not record confirmation_sent_at:', error.message)
  } catch (err) {
    console.warn('[supabase] could not record confirmation_sent_at:', err)
  }
}

// Atomically claims the right to send an appointment's reminder: the update
// only matches while reminder_sent_at is still null, so when two devices are
// open at once only one of them gets the row back and sends.
// Returns 'claimed' | 'already' | 'unsupported' (column missing / no Supabase
// - the caller then falls back to this device's own sent-list).
export async function claimAppointmentReminder(id) {
  if (!isSupabaseConfigured) return 'unsupported'
  try {
    const { data, error } = await supabase
      .from('appointments')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', id)
      .is('reminder_sent_at', null)
      .select('id')
    if (error) return 'unsupported'
    return data && data.length > 0 ? 'claimed' : 'already'
  } catch {
    return 'unsupported'
  }
}

// Gives the claim back if the send then failed, so it's retried.
export async function releaseAppointmentReminder(id) {
  if (!isSupabaseConfigured) return
  try {
    await supabase.from('appointments').update({ reminder_sent_at: null }).eq('id', id)
  } catch {
    // best effort
  }
}

// Front-desk (manual) booking: unlike website bookings, this app inserts the
// row itself. Allowed by the existing "Public can create appointments"
// policy, which covers signed-in users too. Returns { ok: true, row } or
// { ok: false, error }. Never throws.
export async function insertAppointmentRemote(row) {
  if (!isSupabaseConfigured) {
    return { ok: false, error: 'Supabase isn’t configured, so appointments can’t be saved.' }
  }
  try {
    const { data, error } = await supabase.from('appointments').insert(row).select().single()
    if (error) return { ok: false, error: error.message }
    return { ok: true, row: data }
  } catch (err) {
    return { ok: false, error: 'Couldn’t reach the server. Check your connection and try again.' }
  }
}
