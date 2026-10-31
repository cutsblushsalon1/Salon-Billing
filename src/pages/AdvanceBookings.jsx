import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarPlus, CalendarClock, Wallet, Eye, ReceiptText, X, Trash2, Printer, Download, Phone, Plus } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { PageHeader, EmptyState, Badge, StatCard, Modal } from '../components/ui.jsx'
import BillPreview from '../components/BillPreview.jsx'
import {
  formatCurrency,
  formatDate,
  formatTimeLabel,
  formatPhoneDisplay,
  getBillStaffNames,
  advanceBookingToReceipt,
} from '../utils/helpers.js'
import { downloadBillPDF } from '../utils/pdf.js'
import { can } from '../utils/permissions.js'

const TABS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'today', label: 'Today' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'all', label: 'All' },
]

const STATUS_TONE = { booked: 'brass', completed: 'success', cancelled: 'danger' }

function todayStr() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function AdvanceBookings() {
  const { advanceBookings, updateAdvanceBooking, deleteAdvanceBooking, settings, role } = useApp()
  const navigate = useNavigate()
  const canDelete = can(role, 'bill.delete')
  const [tab, setTab] = useState('upcoming')
  const [viewBooking, setViewBooking] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [refunded, setRefunded] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const cs = settings.currencySymbol
  const today = todayStr()

  const filtered = useMemo(() => {
    return advanceBookings
      .filter((b) => {
        if (tab === 'today') return b.status === 'booked' && b.scheduledDate === today
        if (tab === 'upcoming') return b.status === 'booked' && b.scheduledDate >= today
        if (tab === 'completed') return b.status === 'completed'
        if (tab === 'cancelled') return b.status === 'cancelled'
        return true
      })
      .sort((a, b) => {
        const d = (a.scheduledDate || '').localeCompare(b.scheduledDate || '')
        if (d !== 0) return tab === 'completed' || tab === 'cancelled' || tab === 'all' ? -d : d
        return (a.scheduledTime || '').localeCompare(b.scheduledTime || '')
      })
  }, [advanceBookings, tab, today])

  const open = advanceBookings.filter((b) => b.status === 'booked')
  const todayCount = open.filter((b) => b.scheduledDate === today).length
  const overdueCount = open.filter((b) => b.scheduledDate < today).length
  const advanceHeld = open.reduce((s, b) => s + (Number(b.advanceAmount) || 0), 0)

  function finalise(b) {
    navigate('/new-bill', { state: { advanceBookingId: b.id } })
  }

  function confirmCancel() {
    updateAdvanceBooking(cancelTarget.id, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      advanceRefunded: refunded,
    })
    setCancelTarget(null)
    setRefunded(false)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Front Desk"
        title="Advance Bookings"
        subtitle="Clients who paid an advance. Finalise the bill when they visit — the advance is deducted automatically."
        actions={
          <button onClick={() => navigate('/new-bill')} className="btn-primary">
            <Plus size={15} /> New advance booking
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Today's bookings" value={todayCount} icon={CalendarClock} accent="plum" />
        <StatCard
          label="Open bookings"
          value={open.length}
          icon={CalendarPlus}
          accent="brass"
          trend={overdueCount > 0 ? `${overdueCount} past their date, not yet billed` : undefined}
        />
        <StatCard label="Advance held" value={formatCurrency(advanceHeld, cs)} icon={Wallet} accent="success" />
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
          icon={CalendarPlus}
          title="No advance bookings here"
          subtitle="Use New Bill → Advance booking to take an advance payment and book a client in."
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-black/[0.02] text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Receipt</th>
                  <th className="text-left px-5 py-3 font-semibold">Client</th>
                  <th className="text-left px-5 py-3 font-semibold">Services</th>
                  <th className="text-left px-5 py-3 font-semibold">Date &amp; time</th>
                  <th className="text-right px-5 py-3 font-semibold">Estimate</th>
                  <th className="text-right px-5 py-3 font-semibold">Advance</th>
                  <th className="text-right px-5 py-3 font-semibold">Due</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                  <th className="text-right px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filtered.map((b) => {
                  const overdue = b.status === 'booked' && b.scheduledDate < today
                  return (
                    <tr key={b.id} className="hover:bg-black/[0.015]">
                      <td className="px-5 py-3.5 font-mono text-xs text-plum">{b.receiptNo}</td>
                      <td className="px-5 py-3.5 font-medium text-ink">
                        {b.client?.name}
                        {b.client?.phone && (
                          <span className="flex items-center gap-1 text-xs text-muted font-normal mt-0.5">
                            <Phone size={11} /> {formatPhoneDisplay(b.client.phone)}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-muted max-w-[220px]">
                        <span className="block truncate">{b.items.map((i) => i.name).join(', ')}</span>
                        {getBillStaffNames(b).length > 0 && (
                          <span className="block text-xs truncate">{getBillStaffNames(b).join(', ')}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-muted whitespace-nowrap">
                        {formatDate(b.scheduledDate)}
                        {b.scheduledTime && <span className="block text-xs">{formatTimeLabel(b.scheduledTime)}</span>}
                        {overdue && <span className="block text-xs text-danger">Date passed</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular">{formatCurrency(b.total, cs)}</td>
                      <td className="px-5 py-3.5 text-right tabular text-success font-medium">
                        {formatCurrency(b.advanceAmount, cs)}
                        <span className="block text-[11px] text-muted font-normal">{b.advanceMethod}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right tabular font-semibold text-ink">
                        {formatCurrency(Math.max(0, b.total - b.advanceAmount), cs)}
                      </td>
                      <td className="px-5 py-3.5 capitalize">
                        <Badge tone={STATUS_TONE[b.status] || 'muted'}>{b.status}</Badge>
                        {b.status === 'completed' && b.billNo && <span className="block text-[11px] text-muted mt-0.5">{b.billNo}</span>}
                        {b.status === 'cancelled' && (
                          <span className="block text-[11px] text-muted mt-0.5">
                            {b.advanceRefunded ? 'Advance refunded' : 'Advance retained'}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setViewBooking(b)} className="p-1.5 text-muted hover:text-plum" title="View receipt">
                            <Eye size={15} />
                          </button>
                          {b.status === 'booked' && (
                            <>
                              <button onClick={() => finalise(b)} className="p-1.5 text-muted hover:text-success" title="Finalise bill">
                                <ReceiptText size={15} />
                              </button>
                              <button onClick={() => setCancelTarget(b)} className="p-1.5 text-muted hover:text-danger" title="Cancel booking">
                                <X size={15} />
                              </button>
                            </>
                          )}
                          {canDelete && (
                            <button onClick={() => setDeleteTarget(b)} className="p-1.5 text-muted hover:text-danger" title="Delete">
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={!!viewBooking} onClose={() => setViewBooking(null)} title="Advance receipt" size="lg">
        {viewBooking && (
          <div>
            <div className="border border-black/10 rounded-xl overflow-hidden mb-5">
              <BillPreview bill={advanceBookingToReceipt(viewBooking)} settings={settings} />
            </div>
            {viewBooking.notes && <p className="text-sm text-muted mb-4">Notes: {viewBooking.notes}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => window.print()} className="btn-ghost">
                <Printer size={15} /> Print
              </button>
              <button onClick={() => downloadBillPDF(advanceBookingToReceipt(viewBooking), settings)} className="btn-ghost">
                <Download size={15} /> Download PDF
              </button>
              {viewBooking.status === 'booked' && (
                <button
                  onClick={() => {
                    finalise(viewBooking)
                  }}
                  className="btn-primary ml-auto"
                >
                  <ReceiptText size={15} /> Finalise bill
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Cancel booking?" size="sm">
        {cancelTarget && (
          <div>
            <p className="text-sm text-muted mb-4">
              Cancel <span className="font-semibold text-ink">{cancelTarget.receiptNo}</span> for {cancelTarget.client?.name}? They paid an
              advance of {formatCurrency(cancelTarget.advanceAmount, cs)}.
            </p>
            <label className="flex items-center gap-2 text-sm text-ink mb-5">
              <input type="checkbox" className="w-4 h-4 accent-plum" checked={refunded} onChange={(e) => setRefunded(e.target.checked)} />
              The advance has been refunded to the client
            </label>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setCancelTarget(null)} className="btn-ghost">
                Keep booking
              </button>
              <button onClick={confirmCancel} className="btn-danger">
                Cancel booking
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete booking?" size="sm">
        {deleteTarget && (
          <div>
            <p className="text-sm text-muted mb-5">
              Permanently remove <span className="font-semibold text-ink">{deleteTarget.receiptNo}</span>? This can't be undone.
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="btn-ghost">
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteAdvanceBooking(deleteTarget.id)
                  setDeleteTarget(null)
                }}
                className="btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
