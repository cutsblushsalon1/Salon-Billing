import { supabase } from '../lib/supabaseClient.js'

// Fire-and-forget upsert, called right after a bill is created/edited locally.
// Keyed on bill_no (e.g. "INV-0001") so the same invoice re-syncs on edit
// instead of duplicating rows. Never throws - if it fails, the local bill
// still saved fine, the client just won't have a working invoice link yet.
export async function pushInvoiceToSupabase(bill, settings) {
  try {
    const { error } = await supabase
      .from('invoices')
      .upsert({ bill_no: bill.billNo, bill, settings }, { onConflict: 'bill_no' })

    if (error) console.error('[supabase] failed to sync invoice:', error.message)
  } catch (err) {
    console.error('[supabase] failed to sync invoice:', err)
  }
}

// Used by the public /invoice/:billNo page. No auth - anyone with the link
// (and the exact bill number) can read this one row.
export async function fetchInvoiceByBillNo(billNo) {
  const { data, error } = await supabase
    .from('invoices')
    .select('bill, settings')
    .eq('bill_no', billNo)
    .single()

  if (error) throw error
  return data // { bill, settings }
}
