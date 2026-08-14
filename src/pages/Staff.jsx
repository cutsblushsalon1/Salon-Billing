import React, { useEffect, useMemo, useState } from 'react'
import {
  Search,
  UserPlus,
  Users2,
  Phone,
  Pencil,
  Trash2,
  Power,
  CalendarDays,
  Clock,
  ClipboardCheck,
  Wallet,
  Percent,
  Download,
  Scissors,
  Package,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { PageHeader, Modal, EmptyState, Badge } from '../components/ui.jsx'
import { formatCurrency, formatDate, uid, isSameMonth, calcBillItemRevenue } from '../utils/helpers.js'
import { downloadAttendanceExcel } from '../utils/excel.js'

const emptyForm = {
  name: '',
  role: '',
  phone: '',
  serviceCommissionPercent: '10',
  productCommissionPercent: '10',
  salary: '',
  joinedAt: '',
}
const STATUS_OPTIONS = ['Present', 'Absent', 'Half Day', 'Leave']
const STATUS_TONE = { Present: 'success', Absent: 'danger', 'Half Day': 'brass', Leave: 'muted' }

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

const TABS = [
  { id: 'team', label: 'Team', icon: Users2 },
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
]

export default function Staff() {
  const { staff, bills, settings, upsertStaff, deleteStaff } = useApp()
  const [tab, setTab] = useState('team')
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const statsByStaff = useMemo(() => {
    const map = {}
    const today = new Date()

    function ensure(id) {
      if (!map[id]) map[id] = { count: 0, revenue: 0, monthServiceRevenue: 0, monthProductRevenue: 0 }
      return map[id]
    }

    bills.forEach((b) => {
      const inMonth = isSameMonth(b.date, today)
      const hasStaffedItems = b.items?.some((it) => it.staffId)

      if (hasStaffedItems) {
        // Each item's revenue already has its own item-level discount removed,
        // AND its fair share of any flat/whole-bill discount removed too — so
        // a bill-level discount is never invisible to staff numbers, and with
        // multiple staff on one bill it's spread across everyone proportionally
        // to what they actually did, not dumped on a single person.
        const effectiveRevenues = calcBillItemRevenue(b)
        b.items.forEach((it, idx) => {
          if (!it.staffId) return
          const revenue = effectiveRevenues[idx]
          const entry = ensure(it.staffId)
          entry.count += 1
          entry.revenue += revenue
          if (inMonth) {
            if (it.type === 'product') entry.monthProductRevenue += revenue
            else entry.monthServiceRevenue += revenue
          }
        })
      } else if (b.staff?.id) {
        // Legacy bills created before per-item staff assignment existed —
        // no per-item type breakdown available, so count it all as services.
        const entry = ensure(b.staff.id)
        entry.count += 1
        entry.revenue += b.total
        if (inMonth) {
          entry.monthServiceRevenue += b.total
        }
      }
    })

    return map
  }, [bills])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return staff.filter((s) => s.name.toLowerCase().includes(q) || (s.role || '').toLowerCase().includes(q))
  }, [staff, query])

  function openAdd() {
    setForm(emptyForm)
    setEditingId(null)
    setModalOpen(true)
  }

  function openEdit(s) {
    setForm({
      name: s.name,
      role: s.role || '',
      phone: s.phone || '',
      // Fall back to the old single `commissionPercent` field for staff
      // saved before service/product commissions were split out.
      serviceCommissionPercent: s.serviceCommissionPercent ?? s.commissionPercent ?? '10',
      productCommissionPercent: s.productCommissionPercent ?? s.commissionPercent ?? '10',
      salary: s.salary ?? '',
      joinedAt: s.joinedAt || '',
    })
    setEditingId(s.id)
    setModalOpen(true)
  }

  function handleSave() {
    if (!form.name.trim()) return
    upsertStaff({
      id: editingId || uid('stf'),
      name: form.name,
      role: form.role || 'Staff',
      phone: form.phone,
      serviceCommissionPercent: Number(form.serviceCommissionPercent) || 0,
      productCommissionPercent: Number(form.productCommissionPercent) || 0,
      salary: Number(form.salary) || 0,
      joinedAt: form.joinedAt || todayISO(),
      active: editingId ? staff.find((s) => s.id === editingId)?.active ?? true : true,
    })
    setModalOpen(false)
  }

  function toggleActive(s) {
    upsertStaff({ ...s, active: !s.active })
  }

  return (
    <div>
      <PageHeader
        eyebrow="Team"
        title="Staff"
        subtitle={`${staff.length} team member${staff.length === 1 ? '' : 's'} on record`}
        actions={
          tab === 'team' && (
            <button className="btn-primary" onClick={openAdd}>
              <UserPlus size={16} /> Add Staff
            </button>
          )
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-colors ${
              tab === id ? 'bg-plum text-cream' : 'bg-black/5 text-muted hover:bg-black/10'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'team' && (
        <div>
          <div className="relative mb-6 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input pl-10" placeholder="Search by name or role…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={Users2}
              title={staff.length === 0 ? 'No staff yet' : 'No matches'}
              subtitle={staff.length === 0 ? 'Add stylists, barbers or beauticians to assign them on bills.' : 'Try a different search term.'}
              action={
                staff.length === 0 && (
                  <button className="btn-primary" onClick={openAdd}>
                    <UserPlus size={16} /> Add Staff
                  </button>
                )
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((s) => {
                const stats = statsByStaff[s.id] || { count: 0, revenue: 0, monthServiceRevenue: 0, monthProductRevenue: 0 }
                return (
                  <div key={s.id} className={`card p-5 flex flex-col ${!s.active ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-plum text-cream flex items-center justify-center text-sm font-semibold shrink-0">
                          {s.name[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-ink truncate">{s.name}</p>
                          <p className="text-xs text-muted flex items-center gap-1">
                            <Phone size={11} /> {s.phone || '—'}
                          </p>
                        </div>
                      </div>
                      <Badge tone={s.active ? 'success' : 'muted'}>{s.active ? 'Active' : 'Inactive'}</Badge>
                    </div>

                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <Badge tone="brass">{s.role}</Badge>
                      <span className="text-xs text-muted flex items-center gap-1">
                        <Scissors size={11} /> {s.serviceCommissionPercent ?? s.commissionPercent ?? 0}%
                      </span>
                      <span className="text-xs text-muted flex items-center gap-1">
                        <Package size={11} /> {s.productCommissionPercent ?? s.commissionPercent ?? 0}%
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                      <div className="bg-black/[0.02] rounded-lg p-2.5">
                        <p className="text-muted mb-0.5">Items served</p>
                        <p className="font-semibold text-ink tabular">{stats.count}</p>
                      </div>
                      <div className="bg-black/[0.02] rounded-lg p-2.5">
                        <p className="text-muted mb-0.5">Lifetime revenue</p>
                        <p className="font-semibold text-ink tabular">{formatCurrency(stats.revenue, settings.currencySymbol)}</p>
                      </div>
                      <div className="bg-black/[0.02] rounded-lg p-2.5">
                        <p className="text-muted mb-0.5 flex items-center gap-1">
                          <Scissors size={11} /> Service revenue
                        </p>
                        <p className="font-semibold text-ink tabular">{formatCurrency(stats.monthServiceRevenue, settings.currencySymbol)}</p>
                      </div>
                      <div className="bg-black/[0.02] rounded-lg p-2.5">
                        <p className="text-muted mb-0.5 flex items-center gap-1">
                          <Package size={11} /> Product revenue
                        </p>
                        <p className="font-semibold text-ink tabular">{formatCurrency(stats.monthProductRevenue, settings.currencySymbol)}</p>
                      </div>
                      <div className="bg-black/[0.02] rounded-lg p-2.5">
                        <p className="text-muted mb-0.5 flex items-center gap-1">
                          <Scissors size={11} /> Service commission
                        </p>
                        <p className="font-semibold text-ink tabular">
                          {formatCurrency(
                            (stats.monthServiceRevenue * (s.serviceCommissionPercent ?? s.commissionPercent ?? 0)) / 100,
                            settings.currencySymbol,
                          )}
                        </p>
                      </div>
                      <div className="bg-black/[0.02] rounded-lg p-2.5">
                        <p className="text-muted mb-0.5 flex items-center gap-1">
                          <Package size={11} /> Product commission
                        </p>
                        <p className="font-semibold text-ink tabular">
                          {formatCurrency(
                            (stats.monthProductRevenue * (s.productCommissionPercent ?? s.commissionPercent ?? 0)) / 100,
                            settings.currencySymbol,
                          )}
                        </p>
                      </div>
                      <div className="bg-black/[0.02] rounded-lg p-2.5">
                        <p className="text-muted mb-0.5 flex items-center gap-1">
                          <Wallet size={11} /> Monthly salary
                        </p>
                        <p className="font-semibold text-ink tabular">{formatCurrency(s.salary || 0, settings.currencySymbol)}</p>
                      </div>
                      <div className="bg-black/[0.02] rounded-lg p-2.5">
                        <p className="text-muted mb-0.5 flex items-center gap-1">
                          <CalendarDays size={11} /> Joined
                        </p>
                        <p className="font-semibold text-ink">{s.joinedAt ? formatDate(s.joinedAt) : '—'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-auto pt-3 border-t border-black/5">
                      <button onClick={() => toggleActive(s)} className="btn-ghost text-xs py-1.5 flex-1">
                        <Power size={13} /> {s.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => openEdit(s)} className="p-2 text-muted hover:text-plum">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setConfirmDelete(s)} className="p-2 text-muted hover:text-danger">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'attendance' && <AttendanceTab />}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit staff' : 'Add staff'}>
        <div className="space-y-3">
          <div>
            <label className="label">Full name</label>
            <input className="input" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Role</label>
              <input
                className="input"
                placeholder="Stylist, Barber, Beautician…"
                value={form.role}
                onChange={(e) => setForm((s) => ({ ...s, role: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label flex items-center gap-1.5">
                <Scissors size={12} /> Service commission %
              </label>
              <input
                className="input"
                type="number"
                min="0"
                max="100"
                value={form.serviceCommissionPercent}
                onChange={(e) => setForm((s) => ({ ...s, serviceCommissionPercent: e.target.value }))}
              />
            </div>
            <div>
              <label className="label flex items-center gap-1.5">
                <Package size={12} /> Product commission %
              </label>
              <input
                className="input"
                type="number"
                min="0"
                max="100"
                value={form.productCommissionPercent}
                onChange={(e) => setForm((s) => ({ ...s, productCommissionPercent: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="label">Monthly salary ({settings.currencySymbol})</label>
            <input
              className="input"
              type="number"
              min="0"
              value={form.salary}
              onChange={(e) => setForm((s) => ({ ...s, salary: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Joining date</label>
            <input className="input" type="date" value={form.joinedAt} onChange={(e) => setForm((s) => ({ ...s, joinedAt: e.target.value }))} />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-ghost">
              Cancel
            </button>
            <button onClick={handleSave} className="btn-primary" disabled={!form.name.trim()}>
              Save staff
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Remove staff member?" size="sm">
        {confirmDelete && (
          <div>
            <p className="text-sm text-muted mb-5">
              Remove <span className="font-semibold text-ink">{confirmDelete.name}</span> from your team? Past bills will keep their name
              for the record, but they won't appear in the staff picker or attendance sheet anymore.
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost">
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteStaff(confirmDelete.id)
                  setConfirmDelete(null)
                }}
                className="btn-danger"
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function AttendanceTab() {
  const { staff, attendance, markAttendance, deleteAttendance } = useApp()
  const [date, setDate] = useState(todayISO())
  const [staffFilter, setStaffFilter] = useState('All')
  const activeStaff = staff.filter((s) => s.active)

  const recordFor = (staffId) => attendance.find((a) => a.staffId === staffId && a.date === date)

  const filteredLog = useMemo(() => {
    return [...attendance]
      .filter((a) => staffFilter === 'All' || a.staffId === staffFilter)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [attendance, staffFilter])

  const recentLog = filteredLog.slice(0, 25)

  function handleDownload() {
    const label = staffFilter === 'All' ? 'attendance-all-staff' : `attendance-${staff.find((s) => s.id === staffFilter)?.name || 'staff'}`
    downloadAttendanceExcel(filteredLog, staff, label.toLowerCase().replace(/\s+/g, '-'))
  }

  return (
    <div className="space-y-6">
      {/* Mark attendance for a date */}
      <section className="card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <p className="font-display text-lg text-ink">Mark attendance</p>
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-muted" />
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        {activeStaff.length === 0 ? (
          <EmptyState icon={Users2} title="No active staff" subtitle="Add and activate staff members from the Team tab first." />
        ) : (
          <div className="divide-y divide-black/5">
            {activeStaff.map((s) => (
              <AttendanceRow key={s.id} staffMember={s} date={date} existing={recordFor(s.id)} onSave={markAttendance} />
            ))}
          </div>
        )}
      </section>

      {/* Recent log */}
      <section className="card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <p className="font-display text-lg text-ink">Attendance log</p>
          <div className="flex items-center gap-2">
            <select className="input sm:w-52" value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)}>
              <option value="All">All staff</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button onClick={handleDownload} disabled={filteredLog.length === 0} className="btn-brass shrink-0">
              <Download size={15} /> Export .xlsx
            </button>
          </div>
        </div>
        {filteredLog.length > 25 && (
          <p className="text-xs text-muted mb-3">
            Showing the most recent 25 of {filteredLog.length} records below — the exported file includes all of them.
          </p>
        )}

        {recentLog.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="No attendance recorded yet" subtitle="Mark attendance above to start building the log." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="text-left py-2 font-semibold">Staff</th>
                  <th className="text-left py-2 font-semibold">Date</th>
                  <th className="text-left py-2 font-semibold">Status</th>
                  <th className="text-left py-2 font-semibold">Check-in</th>
                  <th className="text-left py-2 font-semibold">Check-out</th>
                  <th className="text-right py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {recentLog.map((a) => {
                  const member = staff.find((s) => s.id === a.staffId)
                  return (
                    <tr key={a.id}>
                      <td className="py-2.5 font-medium text-ink">{member?.name || 'Removed staff'}</td>
                      <td className="py-2.5 text-muted">{formatDate(a.date)}</td>
                      <td className="py-2.5">
                        <Badge tone={STATUS_TONE[a.status] || 'muted'}>{a.status}</Badge>
                      </td>
                      <td className="py-2.5 text-muted">{a.checkIn || '—'}</td>
                      <td className="py-2.5 text-muted">{a.checkOut || '—'}</td>
                      <td className="py-2.5 text-right">
                        <button onClick={() => deleteAttendance(a.id)} className="p-1.5 text-muted hover:text-danger">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function AttendanceRow({ staffMember, date, existing, onSave }) {
  const [status, setStatus] = useState(existing?.status || 'Present')
  const [checkIn, setCheckIn] = useState(existing?.checkIn || '')
  const [checkOut, setCheckOut] = useState(existing?.checkOut || '')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setStatus(existing?.status || 'Present')
    setCheckIn(existing?.checkIn || '')
    setCheckOut(existing?.checkOut || '')
    setSaved(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, existing?.id])

  function handleSave() {
    onSave({ staffId: staffMember.id, date, status, checkIn, checkOut })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="py-3 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2.5 min-w-[160px] flex-1">
        <div className="w-8 h-8 rounded-full bg-plum text-cream flex items-center justify-center text-xs font-semibold shrink-0">
          {staffMember.name[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink truncate">{staffMember.name}</p>
          <p className="text-[11px] text-muted">{staffMember.role}</p>
        </div>
      </div>

      <select className="input w-32 py-1.5 text-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1.5">
        <Clock size={13} className="text-muted" />
        <input
          type="time"
          className="input w-28 py-1.5 text-xs"
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          disabled={status === 'Absent' || status === 'Leave'}
        />
        <span className="text-muted text-xs">to</span>
        <input
          type="time"
          className="input w-28 py-1.5 text-xs"
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          disabled={status === 'Absent' || status === 'Leave'}
        />
      </div>

      <button onClick={handleSave} className={saved ? 'btn-ghost text-xs py-1.5' : 'btn-brass text-xs py-1.5'}>
        {saved ? 'Saved ✓' : 'Save'}
      </button>
    </div>
  )
}
