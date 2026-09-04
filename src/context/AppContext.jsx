import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { seedServices, seedProducts, seedStaff, seedTemplates, seedMembershipPlans, defaultSettings } from '../data/seed.js'
import { uid, buildInvoiceNumber } from '../utils/helpers.js'
import { pushInvoiceToSupabase } from '../utils/invoiceSync.js'
import { fetchAppState, fetchAppStateKey, saveAppState } from '../lib/appStateSync.js'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'
import { fetchAppointments, updateAppointmentStatus, deleteAppointmentRemote, subscribeToAppointments } from '../utils/appointmentsSync.js'
import { pushPublicCatalog } from '../utils/publicCatalogSync.js'
import { requestNotificationPermission, notifyNewAppointment } from '../utils/appointmentAlerts.js'

const AppContext = createContext(null)

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('Failed to save', key, e)
  }
}

const STORAGE_KEYS = {
  clients: 'salon_clients',
  services: 'salon_services',
  products: 'salon_products',
  staff: 'salon_staff',
  attendance: 'salon_attendance',
  templates: 'salon_templates',
  followUps: 'salon_followups',
  bills: 'salon_bills',
  expenses: 'salon_expenses',
  settings: 'salon_settings',
  membershipPlans: 'salon_membership_plans',
  clientMemberships: 'salon_client_memberships',
}

export function AppProvider({ children }) {
  // Real Supabase Auth session, not a locally-stored username/password. `user`
  // is the signed-in Supabase user (or null); supabase-js persists the session
  // itself (in localStorage, under its own key) and refreshes tokens
  // automatically, so there's no manual session bookkeeping here.
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const isAuthed = !!user

  const [clients, setClients] = useState(() => loadJSON(STORAGE_KEYS.clients, []))
  const [services, setServices] = useState(() => loadJSON(STORAGE_KEYS.services, seedServices))
  const [products, setProducts] = useState(() => loadJSON(STORAGE_KEYS.products, seedProducts))
  const [staff, setStaff] = useState(() => loadJSON(STORAGE_KEYS.staff, seedStaff))
  const [attendance, setAttendance] = useState(() => loadJSON(STORAGE_KEYS.attendance, []))
  const [templates, setTemplates] = useState(() => loadJSON(STORAGE_KEYS.templates, seedTemplates))
  const [followUps, setFollowUps] = useState(() => loadJSON(STORAGE_KEYS.followUps, []))
  const [bills, setBills] = useState(() => loadJSON(STORAGE_KEYS.bills, []))
  const [expenses, setExpenses] = useState(() => loadJSON(STORAGE_KEYS.expenses, []))
  // Merge over defaultSettings (not just fall back to it) so a
  // returning user's older localStorage blob - saved before newer
  // settings fields existed (e.g. the invoice WhatsApp API options)
  // - still picks up sensible defaults for whatever it's missing,
  // instead of those fields loading as undefined.
  const [settings, setSettings] = useState(() => ({ ...defaultSettings, ...loadJSON(STORAGE_KEYS.settings, defaultSettings) }))
  const [membershipPlans, setMembershipPlans] = useState(() => loadJSON(STORAGE_KEYS.membershipPlans, seedMembershipPlans))
  const [clientMemberships, setClientMemberships] = useState(() => loadJSON(STORAGE_KEYS.clientMemberships, []))

  // Appointments booked by customers on the salon's separate public website.
  // These live in their own Supabase table (not the app_state blob) so the
  // booking site can insert a new row any time without needing to read and
  // merge the whole collection first. Reloaded here (and kept live via a
  // realtime subscription) so a booking made just now shows up on screen
  // without a refresh.
  const [appointments, setAppointments] = useState([])

  // Becomes true once the one-time Supabase pull below has resolved (or
  // been skipped because Supabase isn't configured). The save effects wait
  // for this so a fresh page load doesn't push stale local/seed data over
  // whatever's already saved remotely before the pull has a chance to land.
  const [hydrated, setHydrated] = useState(false)

  // One-time pull on mount: whatever's in Supabase wins over localStorage/
  // seed data, since Supabase is the shared source of truth across devices.
  // If Supabase isn't configured (no env vars) or the request fails, this
  // resolves to {} and the app just keeps running on localStorage, same as
  // before - nothing breaks without a backend.
  useEffect(() => {
    let cancelled = false
    fetchAppState().then((remote) => {
      if (cancelled) return
      if (remote.clients) setClients(remote.clients)
      if (remote.services) setServices(remote.services)
      if (remote.products) setProducts(remote.products)
      if (remote.staff) setStaff(remote.staff)
      if (remote.attendance) setAttendance(remote.attendance)
      if (remote.templates) setTemplates(remote.templates)
      if (remote.followUps) setFollowUps(remote.followUps)
      if (remote.bills) setBills(remote.bills)
      if (remote.expenses) setExpenses(remote.expenses)
      if (remote.settings) setSettings(remote.settings)
      if (remote.membershipPlans) setMembershipPlans(remote.membershipPlans)
      if (remote.clientMemberships) setClientMemberships(remote.clientMemberships)
      setHydrated(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Appointments live entirely in Supabase (no local-only fallback, since
  // they're only useful once they can be shared with the public booking
  // site). Load them once signed in, then stay live via realtime so new
  // bookings appear on screen automatically.
  useEffect(() => {
    if (!isAuthed) {
      setAppointments([])
      return
    }
    let cancelled = false
    fetchAppointments().then((rows) => {
      if (!cancelled) setAppointments(rows)
    })
    // Ask for browser notification permission once, up front, so the
    // permission prompt isn't tied to (and blocked by) the realtime event
    // itself. Safe to call repeatedly - it no-ops once already granted/denied.
    requestNotificationPermission()
    const unsubscribe = subscribeToAppointments((payload) => {
      if (payload?.eventType === 'INSERT' && payload.new) {
        notifyNewAppointment(payload.new)
      }
      fetchAppointments().then((rows) => {
        if (!cancelled) setAppointments(rows)
      })
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [isAuthed])

  // Everything below mirrors to Supabase (fire-and-forget) once hydration
  // has settled. Login/session state isn't part of this - it's handled
  // entirely by supabase.auth above, not the app_state table.
  useEffect(() => {
    saveJSON(STORAGE_KEYS.clients, clients)
    if (hydrated) saveAppState('clients', clients)
  }, [clients, hydrated])
  useEffect(() => {
    saveJSON(STORAGE_KEYS.services, services)
    if (hydrated) {
      saveAppState('services', services)
      // Also publish to the public, anon-readable catalog so the salon
      // booking website's service picker always reflects the current list
      // (including newly added services, price changes, or removals).
      pushPublicCatalog('services', services)
    }
  }, [services, hydrated])
  useEffect(() => {
    saveJSON(STORAGE_KEYS.products, products)
    if (hydrated) saveAppState('products', products)
  }, [products, hydrated])
  useEffect(() => {
    saveJSON(STORAGE_KEYS.staff, staff)
    if (hydrated) {
      saveAppState('staff', staff)
      // Publish only a privacy-safe subset (id/name/role, active staff
      // only) to the public catalog so the booking website can offer a
      // "choose your staff" option without ever exposing phone numbers,
      // salaries, or commission rates to anonymous visitors.
      pushPublicCatalog(
        'staff',
        staff.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name, role: s.role })),
      )
    }
  }, [staff, hydrated])
  useEffect(() => {
    saveJSON(STORAGE_KEYS.attendance, attendance)
    if (hydrated) saveAppState('attendance', attendance)
  }, [attendance, hydrated])
  useEffect(() => {
    saveJSON(STORAGE_KEYS.templates, templates)
    if (hydrated) saveAppState('templates', templates)
  }, [templates, hydrated])
  useEffect(() => {
    saveJSON(STORAGE_KEYS.followUps, followUps)
    if (hydrated) saveAppState('followUps', followUps)
  }, [followUps, hydrated])
  useEffect(() => {
    saveJSON(STORAGE_KEYS.expenses, expenses)
    if (hydrated) saveAppState('expenses', expenses)
  }, [expenses, hydrated])
  useEffect(() => {
    saveJSON(STORAGE_KEYS.bills, bills)
    // NOTE: deliberately NOT calling saveAppState('bills', bills) here.
    // This effect fires on every local `bills` change, and this device's
    // in-memory `bills` array only reflects Supabase as of the last mount
    // (or the last merge below) - if another tab/device created a bill
    // since then, blindly pushing this array would overwrite (delete) it.
    // createBill/updateBill/deleteBill each do a fetch-fresh-then-merge
    // write to Supabase instead (see below), which is safe regardless of
    // how stale this device's local copy is. restoreBackup() below also
    // pushes explicitly, since a backup restore IS meant to be a full
    // overwrite.
  }, [bills, hydrated])
  useEffect(() => {
    saveJSON(STORAGE_KEYS.settings, settings)
    if (hydrated) saveAppState('settings', settings)
  }, [settings, hydrated])
  useEffect(() => {
    saveJSON(STORAGE_KEYS.membershipPlans, membershipPlans)
    if (hydrated) saveAppState('membershipPlans', membershipPlans)
  }, [membershipPlans, hydrated])
  useEffect(() => {
    saveJSON(STORAGE_KEYS.clientMemberships, clientMemberships)
    if (hydrated) saveAppState('clientMemberships', clientMemberships)
  }, [clientMemberships, hydrated])

  // Real sign-in against Supabase Auth. The user account itself has to
  // already exist (Supabase Dashboard -> Authentication -> Users -> Add
  // user) - there's no self-serve sign-up screen here, same
  // single-shared-login shape as before, just backed by a real account
  // instead of a hardcoded password.
  const login = useCallback(async (email, password) => {
    if (!isSupabaseConfigured) {
      return {
        ok: false,
        error: 'Supabase isn\u2019t configured yet. Add VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY to .env and restart the dev server.',
      }
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { ok: false, error: error.message }
    setUser(data.user)
    return { ok: true }
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  // Updates the signed-in user's email and/or password. Pass only what's
  // changing - {password} to just change the password, {email, password}
  // for both. Changing the email typically triggers a Supabase confirmation
  // email before it takes effect, depending on your project's auth settings.
  const updateLogin = useCallback(async ({ email, password } = {}) => {
    const payload = {}
    if (email) payload.email = email
    if (password) payload.password = password
    if (!Object.keys(payload).length) return { ok: true }

    const { data, error } = await supabase.auth.updateUser(payload)
    if (error) return { ok: false, error: error.message }
    setUser(data.user)
    return { ok: true }
  }, [])

  // ---- Clients ----
  const upsertClient = useCallback((client) => {
    setClients((prev) => {
      const exists = prev.find((c) => c.id === client.id)
      if (exists) return prev.map((c) => (c.id === client.id ? { ...c, ...client } : c))
      return [...prev, { visits: [], totalSpent: 0, createdAt: new Date().toISOString(), ...client }]
    })
  }, [])

  const findClientByPhone = useCallback((phone) => clients.find((c) => c.phone === phone), [clients])

  const deleteClient = useCallback((id) => {
    setClients((prev) => prev.filter((c) => c.id !== id))
  }, [])

  // ---- Services ----
  const upsertService = useCallback((service) => {
    setServices((prev) => {
      const exists = prev.find((s) => s.id === service.id)
      if (exists) return prev.map((s) => (s.id === service.id ? { ...s, ...service } : s))
      return [...prev, { id: uid('svc'), ...service }]
    })
  }, [])

  const deleteService = useCallback((id) => {
    setServices((prev) => prev.filter((s) => s.id !== id))
  }, [])

  // ---- Products ----
  const upsertProduct = useCallback((product) => {
    setProducts((prev) => {
      const exists = prev.find((p) => p.id === product.id)
      if (exists) return prev.map((p) => (p.id === product.id ? { ...p, ...product } : p))
      return [...prev, { id: uid('prd'), ...product }]
    })
  }, [])

  const deleteProduct = useCallback((id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const adjustStock = useCallback((id, delta) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p)))
  }, [])

  // ---- Staff ----
  const upsertStaff = useCallback((member) => {
    setStaff((prev) => {
      const exists = prev.find((s) => s.id === member.id)
      if (exists) return prev.map((s) => (s.id === member.id ? { ...s, ...member } : s))
      return [...prev, { id: uid('stf'), active: true, ...member }]
    })
  }, [])

  const deleteStaff = useCallback((id) => {
    setStaff((prev) => prev.filter((s) => s.id !== id))
  }, [])

  // ---- Attendance ----
  // One record per staff member per date. markAttendance upserts by (staffId, date).
  const markAttendance = useCallback((record) => {
    setAttendance((prev) => {
      const existing = prev.find((a) => a.staffId === record.staffId && a.date === record.date)
      if (existing) return prev.map((a) => (a.id === existing.id ? { ...a, ...record } : a))
      return [...prev, { id: uid('att'), ...record }]
    })
  }, [])

  const deleteAttendance = useCallback((id) => {
    setAttendance((prev) => prev.filter((a) => a.id !== id))
  }, [])

  // ---- Message templates ----
  const upsertTemplate = useCallback((template) => {
    setTemplates((prev) => {
      const isDefault = !!template.isDefault
      const exists = prev.find((t) => t.id === template.id)
      let next = exists ? prev.map((t) => (t.id === template.id ? { ...t, ...template } : t)) : [...prev, { id: uid('tpl'), ...template }]
      // Only one default template at a time
      if (isDefault) {
        next = next.map((t) => (t.id === (template.id || next[next.length - 1].id) ? t : { ...t, isDefault: false }))
      }
      return next
    })
  }, [])

  const deleteTemplate = useCallback((id) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // ---- Follow-up log ----
  // One entry per contact attempt. Used to know who has already been
  // reached out to since their last visit, so the due list doesn't nag twice.
  const logFollowUp = useCallback((record) => {
    setFollowUps((prev) => [{ id: uid('flw'), sentAt: new Date().toISOString(), ...record }, ...prev])
  }, [])

  const deleteFollowUp = useCallback((id) => {
    setFollowUps((prev) => prev.filter((f) => f.id !== id))
  }, [])

  // ---- Bills ----
  // These three helpers are what actually keep Supabase in sync for bills.
  // Each one re-fetches the CURRENT remote `bills` (and, for creates,
  // `settings`) right before writing, merges in just the one change this
  // device is making, and writes that merged result back - instead of
  // pushing whatever this device's local `bills` state happens to be. That
  // fetch-merge-write is what stops a device that's been open for hours
  // (and hasn't seen bills created elsewhere since) from overwriting/
  // deleting other people's newer bills when it finally saves.
  const syncNewBillToRemote = useCallback(async (bill, settingsAtCreation) => {
    if (!isSupabaseConfigured) return
    try {
      const [remoteBillsRaw, remoteSettingsRaw] = await Promise.all([
        fetchAppStateKey('bills'),
        fetchAppStateKey('settings'),
      ])
      const remoteBills = Array.isArray(remoteBillsRaw) ? remoteBillsRaw : []
      const remoteSettings = remoteSettingsRaw || settingsAtCreation

      // Extremely unlikely, but if another device generated the same
      // invoice number in the meantime (e.g. both started from the same
      // stale counter), mint a fresh one now rather than saving a
      // duplicate billNo.
      const billNoTaken = remoteBills.some((b) => b.id !== bill.id && b.billNo === bill.billNo)
      const remoteCounter = Number(remoteSettings.invoiceCounter) || 0
      const localCounter = Number(settingsAtCreation.invoiceCounter) || 0
      const nextCounter = Math.max(remoteCounter, localCounter) + 1
      const finalBill = billNoTaken
        ? { ...bill, billNo: buildInvoiceNumber(settingsAtCreation.invoicePrefix, Math.max(remoteCounter, localCounter)) }
        : bill

      // Remote is the authoritative list of everyone else's bills - just
      // add this one bill to it, don't replace it with this device's copy.
      const mergedBills = [finalBill, ...remoteBills.filter((b) => b.id !== finalBill.id)]
      await saveAppState('bills', mergedBills)
      await saveAppState('settings', { ...remoteSettings, invoiceCounter: nextCounter })

      // Reconcile local state: pick up any bills created elsewhere since
      // this device last synced, keep any not-yet-synced local bills, and
      // fix this bill's number locally if it had to be regenerated above.
      setBills((prevLocal) => {
        const localOnly = prevLocal.filter((b) => b.id !== bill.id && !remoteBills.some((rb) => rb.id === b.id))
        return [finalBill, ...localOnly, ...remoteBills.filter((b) => b.id !== finalBill.id)]
      })
      setSettings((prev) => ({ ...prev, invoiceCounter: Math.max(Number(prev.invoiceCounter) || 0, nextCounter) }))
    } catch (err) {
      console.error('[supabase] failed to merge-sync new bill:', err)
    }
  }, [])

  const syncBillUpdateToRemote = useCallback(async (updatedBill) => {
    if (!isSupabaseConfigured) return
    try {
      const remoteBillsRaw = await fetchAppStateKey('bills')
      const remoteBills = Array.isArray(remoteBillsRaw) ? remoteBillsRaw : []
      const found = remoteBills.some((b) => b.id === updatedBill.id)
      const mergedBills = found
        ? remoteBills.map((b) => (b.id === updatedBill.id ? updatedBill : b))
        : [updatedBill, ...remoteBills]
      await saveAppState('bills', mergedBills)
      setBills((prevLocal) => {
        const localOnly = prevLocal.filter((b) => b.id !== updatedBill.id && !mergedBills.some((rb) => rb.id === b.id))
        return [...localOnly, ...mergedBills]
      })
    } catch (err) {
      console.error('[supabase] failed to merge-sync bill update:', err)
    }
  }, [])

  const syncBillDeleteToRemote = useCallback(async (id) => {
    if (!isSupabaseConfigured) return
    try {
      const remoteBillsRaw = await fetchAppStateKey('bills')
      const remoteBills = Array.isArray(remoteBillsRaw) ? remoteBillsRaw : []
      const mergedBills = remoteBills.filter((b) => b.id !== id)
      await saveAppState('bills', mergedBills)
      setBills((prevLocal) => {
        const localOnly = prevLocal.filter((b) => b.id !== id && !remoteBills.some((rb) => rb.id === b.id))
        return [...localOnly, ...mergedBills]
      })
    } catch (err) {
      console.error('[supabase] failed to merge-sync bill delete:', err)
    }
  }, [])

  // ---- Expenses ----
  // Expenses are stored in the same shared app_state table as the other
  // salon collections. Writes re-fetch the remote collection first so edits
  // or deletes from another device are not accidentally overwritten.
  const syncExpenseCreateToRemote = useCallback(async (expense) => {
    if (!isSupabaseConfigured) return
    try {
      const remoteRaw = await fetchAppStateKey('expenses')
      const remote = Array.isArray(remoteRaw) ? remoteRaw : []
      const merged = remote.some((e) => e.id === expense.id) ? remote : [expense, ...remote]
      await saveAppState('expenses', merged)
      setExpenses((prev) => {
        const remoteIds = new Set(merged.map((e) => e.id))
        const localOnly = prev.filter((e) => !remoteIds.has(e.id))
        return [...localOnly, ...merged]
      })
    } catch (err) {
      console.error('[supabase] failed to merge-sync new expense:', err)
    }
  }, [])

  const syncExpenseUpdateToRemote = useCallback(async (updatedExpense) => {
    if (!isSupabaseConfigured) return
    try {
      const remoteRaw = await fetchAppStateKey('expenses')
      const remote = Array.isArray(remoteRaw) ? remoteRaw : []
      const merged = remote.some((e) => e.id === updatedExpense.id)
        ? remote.map((e) => (e.id === updatedExpense.id ? updatedExpense : e))
        : [updatedExpense, ...remote]
      await saveAppState('expenses', merged)
      setExpenses((prev) => {
        const localOnly = prev.filter((e) => e.id !== updatedExpense.id && !merged.some((re) => re.id === e.id))
        return [...localOnly, ...merged]
      })
    } catch (err) {
      console.error('[supabase] failed to merge-sync expense update:', err)
    }
  }, [])

  const syncExpenseDeleteToRemote = useCallback(async (id) => {
    if (!isSupabaseConfigured) return
    try {
      const remoteRaw = await fetchAppStateKey('expenses')
      const remote = Array.isArray(remoteRaw) ? remoteRaw : []
      const merged = remote.filter((e) => e.id !== id)
      await saveAppState('expenses', merged)
      setExpenses((prev) => {
        const localOnly = prev.filter((e) => e.id !== id && !remote.some((re) => re.id === e.id))
        return [...localOnly, ...merged]
      })
    } catch (err) {
      console.error('[supabase] failed to merge-sync expense delete:', err)
    }
  }, [])

  const addExpense = useCallback((expenseDraft) => {
    const expense = {
      id: uid('expense'),
      createdAt: new Date().toISOString(),
      ...expenseDraft,
      amount: Number(expenseDraft.amount) || 0,
    }
    setExpenses((prev) => [expense, ...prev])
    syncExpenseCreateToRemote(expense)
    return expense
  }, [syncExpenseCreateToRemote])

  const updateExpense = useCallback((id, patch) => {
    setExpenses((prev) => {
      const existing = prev.find((e) => e.id === id)
      if (!existing) return prev
      const updatedExpense = {
        ...existing,
        ...patch,
        id,
        amount: Number(patch.amount ?? existing.amount) || 0,
        updatedAt: new Date().toISOString(),
      }
      // Start the remote merge from the exact updated record.
      syncExpenseUpdateToRemote(updatedExpense)
      return prev.map((e) => (e.id === id ? updatedExpense : e))
    })
  }, [syncExpenseUpdateToRemote])

  const deleteExpense = useCallback((id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id))
    syncExpenseDeleteToRemote(id)
  }, [syncExpenseDeleteToRemote])

  const createBill = useCallback(
    (billDraft) => {
      const billNo = buildInvoiceNumber(settings.invoicePrefix, settings.invoiceCounter)
      const bill = {
        id: uid('bill'),
        billNo,
        date: new Date().toISOString(),
        ...billDraft,
      }
      setBills((prev) => [bill, ...prev])
      setSettings((prev) => ({ ...prev, invoiceCounter: prev.invoiceCounter + 1 }))

      // Deduct product stock
      bill.items
        .filter((it) => it.type === 'product')
        .forEach((it) => {
          setProducts((prev) => prev.map((p) => (p.id === it.refId ? { ...p, stock: Math.max(0, p.stock - it.qty) } : p)))
        })

      // Update client history
      if (bill.client?.id) {
        setClients((prev) =>
          prev.map((c) =>
            c.id === bill.client.id
              ? {
                  ...c,
                  totalSpent: (c.totalSpent || 0) + bill.total,
                  lastVisit: bill.date,
                  visits: [...(c.visits || []), { billId: bill.id, date: bill.date, total: bill.total, items: bill.items.map((i) => i.name) }],
                }
              : c,
          ),
        )
      }

      // Best-effort sync so the WhatsApp invoice link works. Doesn't block
      // the UI - the bill is already saved locally either way.
      pushInvoiceToSupabase(bill, settings)

      // Merge-safe push to the shared `bills`/`settings` rows (see
      // syncNewBillToRemote above) - fire-and-forget, doesn't block the UI.
      syncNewBillToRemote(bill, settings)

      return bill
    },
    [settings, syncNewBillToRemote],
  )

  const deleteBill = useCallback((id) => {
    setBills((prev) => prev.filter((b) => b.id !== id))
    syncBillDeleteToRemote(id)
  }, [syncBillDeleteToRemote])

  // Edits an existing bill in place. Takes the full old bill (as currently
  // displayed) plus a patch of changed fields, and reconciles the knock-on
  // effects that createBill originally applied: product stock levels and the
  // client's total-spent / visit-history record. Callers should recompute
  // totals (subtotal, discountAmount, taxAmount, total, etc.) before calling
  // this, the same way NewBill does via calcBillTotals.
  const updateBill = useCallback((oldBill, patch) => {
    const updatedBill = { ...oldBill, ...patch }

    setBills((prev) => prev.map((b) => (b.id === oldBill.id ? updatedBill : b)))

    // Reconcile product stock: give back what the old items took, then take
    // what the new items need.
    setProducts((prev) => {
      let next = prev
      oldBill.items.filter((it) => it.type === 'product').forEach((it) => {
        next = next.map((p) => (p.id === it.refId ? { ...p, stock: p.stock + it.qty } : p))
      })
      updatedBill.items.filter((it) => it.type === 'product').forEach((it) => {
        next = next.map((p) => (p.id === it.refId ? { ...p, stock: Math.max(0, p.stock - it.qty) } : p))
      })
      return next
    })

    // Reconcile the client's total spent and their matching visit entry
    if (oldBill.client?.id) {
      setClients((prev) =>
        prev.map((c) => {
          if (c.id !== oldBill.client.id) return c
          const spentDelta = updatedBill.total - oldBill.total
          const visits = (c.visits || []).map((v) =>
            v.billId === oldBill.id
              ? { ...v, date: updatedBill.date, total: updatedBill.total, items: updatedBill.items.map((i) => i.name) }
              : v,
          )
          return { ...c, totalSpent: Math.max(0, (c.totalSpent || 0) + spentDelta), visits }
        }),
      )
    }

    // Keep the shared invoice link in sync with the edited bill.
    pushInvoiceToSupabase(updatedBill, settings)

    // Merge-safe push to the shared `bills` row (see syncBillUpdateToRemote
    // above) - fire-and-forget, doesn't block the UI.
    syncBillUpdateToRemote(updatedBill)

    return updatedBill
  }, [settings, syncBillUpdateToRemote])

  // ---- Settings ----
  const updateSettings = useCallback((patch) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  // ---- Membership plans ----
  const upsertMembershipPlan = useCallback((plan) => {
    setMembershipPlans((prev) => {
      const exists = prev.find((p) => p.id === plan.id)
      if (exists) return prev.map((p) => (p.id === plan.id ? { ...p, ...plan } : p))
      return [...prev, { id: uid('plan'), ...plan }]
    })
  }, [])

  const deleteMembershipPlan = useCallback((id) => {
    setMembershipPlans((prev) => prev.filter((p) => p.id !== id))
  }, [])

  // ---- Client memberships ----
  // One enrollment record per client per membership purchase. enrollMembership
  // upserts by id, so it doubles as both "enroll" and "edit enrollment".
  const enrollMembership = useCallback((record) => {
    setClientMemberships((prev) => {
      const exists = prev.find((m) => m.id === record.id)
      if (exists) return prev.map((m) => (m.id === record.id ? { ...m, ...record } : m))
      return [...prev, { id: uid('cmem'), enrolledAt: new Date().toISOString(), ...record }]
    })
  }, [])

  // Extends a membership's expiry by `months`, starting from whichever is
  // later: today, or the membership's current expiry (so renewing early
  // doesn't cost the client days, and renewing late doesn't backdate).
  const renewMembership = useCallback((id, months) => {
    setClientMemberships((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m
        const now = new Date()
        const currentExpiry = new Date(m.expiryDate)
        const base = currentExpiry > now ? currentExpiry : now
        base.setMonth(base.getMonth() + (Number(months) || 0))
        return { ...m, expiryDate: base.toISOString(), renewedAt: new Date().toISOString() }
      }),
    )
  }, [])

  const deleteMembership = useCallback((id) => {
    setClientMemberships((prev) => prev.filter((m) => m.id !== id))
  }, [])

  // Records that `count` free-service redemptions have been used against a
  // membership (called when a bill claims one or more free services), so the
  // remaining free-service allowance shown next time is accurate.
  const claimFreeServices = useCallback((id, count) => {
    if (!count) return
    setClientMemberships((prev) =>
      prev.map((m) => (m.id === id ? { ...m, freeServicesUsed: (Number(m.freeServicesUsed) || 0) + count } : m)),
    )
  }, [])

  // ---- Appointments (booked on the public website, managed here) ----
  // Optimistic local update so the status badge changes instantly, plus the
  // real write to Supabase; the realtime subscription above will reconcile
  // if anything drifts (e.g. another front-desk device editing the same row).
  const markAppointmentStatus = useCallback((id, status) => {
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
    updateAppointmentStatus(id, status)
  }, [])

  const removeAppointment = useCallback((id) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id))
    deleteAppointmentRemote(id)
  }, [])

  // Manually re-publishes the current services list to the public_catalog
  // table the booking website reads from. This normally happens
  // automatically whenever the services list changes (see the effect
  // above), but is also exposed here as a one-click fix from Settings —
  // e.g. if the site's very first ever load raced ahead of that automatic
  // push, or the table/policies were only just set up in Supabase.
  const publishServiceCatalog = useCallback(() => pushPublicCatalog('services', services), [services])

  // Same idea as publishServiceCatalog, for the privacy-safe staff roster
  // (see the effect above for exactly which fields get published).
  const publishStaffRoster = useCallback(
    () =>
      pushPublicCatalog(
        'staff',
        staff.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name, role: s.role })),
      ),
    [staff],
  )

  // ---- Backup / Restore ----
  const exportBackup = useCallback(() => {
    return {
      exportedAt: new Date().toISOString(),
      clients,
      services,
      products,
      staff,
      attendance,
      templates,
      followUps,
      bills,
      expenses,
      settings,
      membershipPlans,
      clientMemberships,
    }
  }, [clients, services, products, staff, attendance, templates, followUps, bills, expenses, settings, membershipPlans, clientMemberships])

  const restoreBackup = useCallback((data) => {
    if (data.clients) setClients(data.clients)
    if (data.services) setServices(data.services)
    if (data.products) setProducts(data.products)
    if (data.staff) setStaff(data.staff)
    if (data.attendance) setAttendance(data.attendance)
    if (data.templates) setTemplates(data.templates)
    if (data.followUps) setFollowUps(data.followUps)
    if (data.expenses) setExpenses(data.expenses)
    if (data.bills) {
      setBills(data.bills)
      // `bills` is intentionally excluded from the generic auto-sync effect
      // (see the comment on that effect) since it must never be pushed from
      // a possibly-stale in-memory copy. A restore IS meant to be a full,
      // deliberate overwrite, so push it explicitly here.
      if (hydrated) saveAppState('bills', data.bills)
    }
    if (data.settings) setSettings(data.settings)
    if (data.membershipPlans) setMembershipPlans(data.membershipPlans)
    if (data.clientMemberships) setClientMemberships(data.clientMemberships)
  }, [hydrated])

  // Reloads the built-in sample services & products (from src/data/seed.js).
  // Useful when the browser's saved catalog is empty/stale and new sample
  // items added to seed.js haven't shown up, since seed data only auto-loads
  // on a brand-new browser with nothing saved yet. This does NOT touch
  // clients, bills, staff, or settings.
  const resetCatalogToDefaults = useCallback(() => {
    setServices(seedServices)
    setProducts(seedProducts)
  }, [])

  const value = {
    isAuthed,
    authLoading,
    user,
    login,
    logout,
    updateLogin,
    clients,
    upsertClient,
    findClientByPhone,
    deleteClient,
    services,
    upsertService,
    deleteService,
    products,
    upsertProduct,
    deleteProduct,
    adjustStock,
    staff,
    upsertStaff,
    deleteStaff,
    attendance,
    markAttendance,
    deleteAttendance,
    templates,
    upsertTemplate,
    deleteTemplate,
    followUps,
    logFollowUp,
    deleteFollowUp,
    bills,
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    createBill,
    updateBill,
    deleteBill,
    settings,
    updateSettings,
    exportBackup,
    restoreBackup,
    resetCatalogToDefaults,
    membershipPlans,
    upsertMembershipPlan,
    deleteMembershipPlan,
    clientMemberships,
    enrollMembership,
    renewMembership,
    deleteMembership,
    claimFreeServices,
    appointments,
    markAppointmentStatus,
    removeAppointment,
    publishServiceCatalog,
    publishStaffRoster,
    isSupabaseConfigured,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
