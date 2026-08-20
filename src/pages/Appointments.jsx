import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, Check, X, Trash2, ReceiptText, Phone, RefreshCw, CalendarCheck2 } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { PageHeader, EmptyState, Badge, StatCard } from '../components/ui.jsx'
import { formatDate } from '../utils/helpers.js'

const TABS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'today', label: 'Today' },
  { id: 'past', label: 'Past' },
  { id: 'all', label: 'All' },
]

const STATUS_TONE = {
  pending: 'brass',
  confirmed: 'plum',
  completed: 'success',
  cancelled: 'danger',
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function Appointments() {
  const { appointments, clients, markAppointmentStatus, removeAppointment } = useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState('upcoming')
  const [confirmDelete, setConfirmDelete] = useState(null)

  const today = todayStr()

  const filtered = useMemo(() => {
    return appointments
      .filter((a) => {
        if (tab === 'today') return a.appointment_date === today
        if (tab === 'upcoming') return a.appointment_date >= today && a.status !== 'cancelled'
        if (tab === 'past') return a.appointment_date < today || a.status === 'completed'
        return true
      })
      .sort((a, b) => {
        const d = (a.appointment_date || '').localeCompare(b.appointment_date || '')
        if (d !== 0) return tab === 'past' ? -d : d
        return (a.appointment_time || '').localeCompare(b.appointment_time || '')
      })
  }, [appointments, tab, today])

  const pendingCount = appointments.filter((a) => a.status === 'pending').length
  const todayCount = appointments.filter((a) => a.appointment_date === today && a.status !== 'cancelled').length

  function goToBill(appt) {
    const match = clients.find((c) => c.phone === appt.phone)
    if (match) {
      navigate('/new-bill', { state: { clientId: match.id } })
    } else {
      navigate('/new-bill', {
        state: { prefillClient: { name: appt.client_name, phone: appt.phone, gender: appt.gender || 'Female' } },
      })
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Front Desk"
        title="Appointments"
        subtitle="Bookings made by customers on your salon website appear here automatically."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Today's appointments" value={todayCount} icon={CalendarClock} accent="plum" />
        <StatCard label="Awaiting confirmation" value={pendingCount} icon={RefreshCw} accent="brass" />
        <StatCard label="Total bookings" value={appointments.length} icon={CalendarCheck2} accent="success" />
      </div>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              tab === id ? 'bg-plum text-cream' : 'bg-black/5 text-muted hover:bg-black/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No appointments here"
          subtitle="Once a customer books on your salon website, it'll show up in this list within moments."
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-black/[0.02] text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Client</th>
                  <th className="text-left px-5 py-3 font-semibold">Service</th>
                  <th className="text-left px-5 py-3 font-semibold">Date &amp; time</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                  <th className="text-right px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-black/[0.015]">
                    <td className="px-5 py-3.5 font-medium text-ink">
                      {a.client_name}
                      {a.phone && (
                        <span className="flex items-center gap-1 text-xs text-muted font-normal mt-0.5">
                          <Phone size={11} /> {a.phone}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-muted">{a.service_name || '—'}</td>
                    <td className="px-5 py-3.5 text-muted">
                      {formatDate(a.appointment_date)}
                      {a.appointment_time && <span className="block text-xs">{a.appointment_time}</span>}
                    </td>
                    <td className="px-5 py-3.5 capitalize">
                      <Badge tone={STATUS_TONE[a.status] || 'muted'}>{a.status}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {a.status === 'pending' && (
                          <button
                            onClick={() => markAppointmentStatus(a.id, 'confirmed')}
                            className="p-1.5 text-muted hover:text-plum"
                            title="Confirm"
                          >
                            <Check size={15} />
                          </button>
                        )}
                        {a.status !== 'completed' && a.status !== 'cancelled' && (
                          <button
                            onClick={() => goToBill(a)}
                            className="p-1.5 text-muted hover:text-success"
                            title="Create bill"
                          >
                            <ReceiptText size={15} />
                          </button>
                        )}
                        {a.status !== 'cancelled' && a.status !== 'completed' && (
                          <button
                            onClick={() => markAppointmentStatus(a.id, 'cancelled')}
                            className="p-1.5 text-muted hover:text-danger"
                            title="Cancel"
                          >
                            <X size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmDelete(a)}
                          className="p-1.5 text-muted hover:text-danger"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-paper rounded-xl2 shadow-card w-full max-w-sm p-6">
            <p className="font-display text-lg text-ink mb-2">Delete appointment?</p>
            <p className="text-sm text-muted mb-5">
              Remove <span className="font-semibold text-ink">{confirmDelete.client_name}</span>'s booking on{' '}
              {formatDate(confirmDelete.appointment_date)}? This can't be undone.
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost">
                Cancel
              </button>
              <button
                onClick={() => {
                  removeAppointment(confirmDelete.id)
                  setConfirmDelete(null)
                }}
                className="btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
