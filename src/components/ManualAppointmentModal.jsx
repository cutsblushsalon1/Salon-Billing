import React, { useMemo, useState } from 'react'
import { Search, User, X } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { Modal } from './ui.jsx'
import {
  capitalizeWordsPreserveSpaces,
  formatTimeLabel,
  formatPhoneDisplay,
  genderToServiceFilter,
  serviceMatchesGender,
  matchesCatalogQuery,
  parseAppointmentDateTime,
} from '../utils/helpers.js'
import { isAppointmentConfirmApiConfigured } from '../utils/whatsappCloudApi.js'

function todayStr() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const emptyForm = () => ({
  name: '',
  phone: '',
  gender: 'Female',
  serviceIds: [],
  staffId: '',
  date: todayStr(),
  time: '',
  notes: '',
  status: 'confirmed',
  sendConfirmation: true,
})

// "Book appointment" form for bookings taken by phone / walk-in. Saves to the
// same appointments table as website bookings (tagged manual), so it shows up
// in the list, gets the automatic reminder, and can be turned into a bill.
export default function ManualAppointmentModal({ open, onClose, onBooked }) {
  const { clients, services, staff, settings, appointments, createManualAppointment, confirmAppointment } = useApp()
  const [form, setForm] = useState(emptyForm)
  const [clientQuery, setClientQuery] = useState('')
  const [serviceQuery, setServiceQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const activeStaff = staff.filter((s) => s.active)
  const confirmMessagesOn = isAppointmentConfirmApiConfigured(settings)

  const clientMatches = useMemo(() => {
    const q = clientQuery.trim().toLowerCase()
    if (!q) return []
    return clients.filter((c) => c.name.toLowerCase().includes(q) || c.phone?.includes(q)).slice(0, 5)
  }, [clientQuery, clients])

  const genderFilter = genderToServiceFilter(form.gender)
  const serviceList = useMemo(
    () =>
      services
        .filter((s) => serviceMatchesGender(s, genderFilter) && matchesCatalogQuery(s, serviceQuery))
        .slice(0, 60),
    [services, genderFilter, serviceQuery],
  )

  function set(patch) {
    setForm((f) => ({ ...f, ...patch }))
  }

  function pickClient(c) {
    set({ name: c.name, phone: (c.phone || '').replace(/[^0-9]/g, '').slice(-10), gender: c.gender || 'Female' })
    setClientQuery('')
  }

  function toggleService(id) {
    setForm((f) => ({
      ...f,
      serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter((x) => x !== id) : [...f.serviceIds, id],
    }))
  }

  const selectedServices = form.serviceIds.map((id) => services.find((s) => s.id === id)).filter(Boolean)
  const timeLabel = form.time ? formatTimeLabel(form.time) : ''

  // Heads-up (not a block) if the chosen staff member already has a booking
  // at that exact time.
  const clash = useMemo(() => {
    if (!form.staffId || !form.date || !form.time) return null
    const mine = parseAppointmentDateTime(form.date, timeLabel)?.getTime()
    return (
      appointments.find(
        (a) =>
          a.staff_id === form.staffId &&
          a.appointment_date === form.date &&
          a.status !== 'cancelled' &&
          parseAppointmentDateTime(a.appointment_date, a.appointment_time)?.getTime() === mine,
      ) || null
    )
  }, [appointments, form.staffId, form.date, form.time, timeLabel])

  function validate() {
    if (!form.name.trim()) return 'Enter the client name.'
    if (form.phone.length !== 10) return 'Enter a 10-digit phone number.'
    if (selectedServices.length === 0) return 'Pick at least one service.'
    if (!form.date) return 'Pick the date.'
    if (form.date < todayStr()) return 'The date can’t be in the past.'
    if (!form.time) return 'Pick the time.'
    if (form.date === todayStr()) {
      const when = parseAppointmentDateTime(form.date, timeLabel)
      if (when && when.getTime() < Date.now() - 60000) return 'That time has already passed today.'
    }
    return ''
  }

  async function handleSave() {
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    setSaving(true)
    setError('')
    const member = activeStaff.find((s) => s.id === form.staffId)
    const result = await createManualAppointment({
      client_name: capitalizeWordsPreserveSpaces(form.name.trim()),
      phone: form.phone,
      gender: form.gender,
      service_name: selectedServices.map((s) => s.name).join(', '),
      appointment_date: form.date,
      appointment_time: timeLabel,
      staff_id: member?.id || null,
      staff_name: member?.name || null,
      notes: form.notes.trim() || null,
      status: form.status,
    })
    if (!result.ok) {
      setSaving(false)
      setError(result.error)
      return
    }
    let note = 'Appointment booked.'
    if (form.status === 'confirmed' && form.sendConfirmation && confirmMessagesOn) {
      const sent = await confirmAppointment(result.row, { resendOnly: true })
      note = sent.sent
        ? 'Appointment booked and WhatsApp confirmation sent.'
        : `Appointment booked, but the WhatsApp confirmation could not be sent: ${sent.error}`
    }
    setSaving(false)
    setForm(emptyForm())
    setServiceQuery('')
    onBooked?.(note, !note.includes('could not'))
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Book appointment" size="lg">
      <div className="space-y-4">
        {/* Client */}
        <div>
          <label className="label">Client</label>
          <div className="relative mb-2">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="input pl-10"
              placeholder="Search an existing client by name or phone…"
              value={clientQuery}
              onChange={(e) => setClientQuery(e.target.value)}
            />
          </div>
          {clientMatches.length > 0 && (
            <div className="border border-black/10 rounded-lg divide-y divide-black/5 mb-3 overflow-hidden">
              {clientMatches.map((c) => (
                <button
                  key={c.id}
                  onClick={() => pickClient(c)}
                  className="w-full flex items-center gap-3 px-3.5 py-2 hover:bg-black/[0.03] text-left"
                >
                  <User size={14} className="text-muted" />
                  <span className="text-sm font-medium text-ink">{c.name}</span>
                  <span className="text-xs text-muted ml-auto">{formatPhoneDisplay(c.phone)}</span>
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              className="input"
              placeholder="Full name"
              value={form.name}
              onChange={(e) => set({ name: capitalizeWordsPreserveSpaces(e.target.value) })}
            />
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted font-medium pointer-events-none">+91</span>
              <input
                className="input pl-12"
                placeholder="Phone number"
                value={form.phone}
                onChange={(e) => set({ phone: e.target.value.replace(/[^0-9]/g, '').slice(0, 10) })}
              />
            </div>
            <select className="input" value={form.gender} onChange={(e) => set({ gender: e.target.value, serviceIds: [] })}>
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
            </select>
          </div>
        </div>

        {/* Services */}
        <div>
          <label className="label">
            Services {genderFilter !== 'All' && <span className="normal-case text-muted font-normal">— {genderFilter === 'Male' ? 'men’s' : 'women’s'} &amp; unisex</span>}
          </label>
          {selectedServices.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selectedServices.map((s) => (
                <span key={s.id} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full bg-plum/10 text-plum text-xs font-medium">
                  {s.name}
                  <button onClick={() => toggleService(s.id)} className="w-4 h-4 rounded-full hover:bg-plum/20 flex items-center justify-center">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            className="input mb-2"
            placeholder="Search services…"
            value={serviceQuery}
            onChange={(e) => setServiceQuery(e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
            {serviceList.map((s) => (
              <label
                key={s.id}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-sm cursor-pointer ${
                  form.serviceIds.includes(s.id) ? 'border-brass bg-brass/10' : 'border-black/10 hover:bg-black/[0.03]'
                }`}
              >
                <input type="checkbox" className="accent-plum" checked={form.serviceIds.includes(s.id)} onChange={() => toggleService(s.id)} />
                <span className="truncate">{s.name}</span>
              </label>
            ))}
            {serviceList.length === 0 && <p className="text-sm text-muted col-span-2 py-3 text-center">No services found.</p>}
          </div>
        </div>

        {/* When / who */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" min={todayStr()} value={form.date} onChange={(e) => set({ date: e.target.value })} />
          </div>
          <div>
            <label className="label">Time</label>
            <input type="time" className="input" value={form.time} onChange={(e) => set({ time: e.target.value })} />
          </div>
          <div>
            <label className="label">Staff (optional)</label>
            <select className="input" value={form.staffId} onChange={(e) => set({ staffId: e.target.value })}>
              <option value="">No preference</option>
              {activeStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {clash && (
          <p className="text-xs text-brass-dark bg-brass/10 rounded-lg px-3 py-2">
            {clash.staff_name || 'This staff member'} already has an appointment at this time ({clash.client_name}). You can still book it.
          </p>
        )}

        <div>
          <label className="label">Notes (optional)</label>
          <input className="input" value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="e.g. called to book, bridal trial" />
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted">Status</span>
            <select className="input w-auto py-1.5" value={form.status} onChange={(e) => set({ status: e.target.value })}>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          {form.status === 'confirmed' && confirmMessagesOn && (
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" className="w-4 h-4 accent-plum" checked={form.sendConfirmation} onChange={(e) => set({ sendConfirmation: e.target.checked })} />
              Send WhatsApp confirmation now
            </label>
          )}
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Booking…' : 'Book appointment'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
