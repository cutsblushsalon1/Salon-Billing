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
