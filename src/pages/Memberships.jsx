import React, { useMemo, useState } from 'react'
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Crown,
  RefreshCw,
  CalendarClock,
  Users as UsersIcon,
  Check,
  Share2,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { PageHeader, Modal, EmptyState, Badge, StatCard } from '../components/ui.jsx'
import {
  formatCurrency,
  formatDate,
  getMembershipStatus,
  getPlanDiscountFields,
  whatsappMembershipMessage,
  whatsappLink,
  uid,
} from '../utils/helpers.js'

const TABS = [
  { id: 'members', label: 'Members' },
  { id: 'plans', label: 'Plans' },
]

const emptyPlanForm = {
  name: '',
  price: '',
  validityMonths: '6',
  discountPercentService: '',
  discountPercentProduct: '',
  birthdayDiscountPercentService: '',
  birthdayDiscountPercentProduct: '',
  anniversaryDiscountPercentService: '',
  anniversaryDiscountPercentProduct: '',
  description: '',
}
const emptyEnrollForm = { name: '', phone: '', birthday: '', anniversary: '', planId: '', startDate: '' }

export default function Memberships() {
  const {
    clients,
    settings,
    upsertClient,
    findClientByPhone,
    membershipPlans,
    upsertMembershipPlan,
    deleteMembershipPlan,
    clientMemberships,
    enrollMembership,
    renewMembership,
    deleteMembership,
  } = useApp()

  const [tab, setTab] = useState('members')
  const [query, setQuery] = useState('')

  // Plans
  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState(null)
  const [planForm, setPlanForm] = useState(emptyPlanForm)
  const [confirmDeletePlan, setConfirmDeletePlan] = useState(null)

  // Members
  const [enrollModalOpen, setEnrollModalOpen] = useState(false)
  const [enrollForm, setEnrollForm] = useState(emptyEnrollForm)
  const [enrollClientQuery, setEnrollClientQuery] = useState('')
  const [confirmDeleteMember, setConfirmDeleteMember] = useState(null)
  const [renewTarget, setRenewTarget] = useState(null)
  const [enrolledMembership, setEnrolledMembership] = useState(null)

  const enrollClientMatches = useMemo(() => {
    if (!enrollClientQuery.trim()) return []
    const q = enrollClientQuery.toLowerCase()
    return clients.filter((c) => c.name.toLowerCase().includes(q) || c.phone?.includes(q)).slice(0, 5)
  }, [enrollClientQuery, clients])

  const enriched = useMemo(() => {
    return clientMemberships
      .map((m) => {
        const client = clients.find((c) => c.id === m.clientId)
        const plan = membershipPlans.find((p) => p.id === m.planId)
        return {
          ...m,
          clientName: client?.name || m.clientName || 'Unknown client',
          clientPhone: client?.phone || '',
          planName: plan?.name || m.planName || 'Unknown plan',
          plan,
          status: getMembershipStatus(m.expiryDate),
        }
      })
      .sort((a, b) => new Date(b.enrolledAt || 0) - new Date(a.enrolledAt || 0))
  }, [clientMemberships, clients, membershipPlans])

  const filteredMembers = useMemo(() => {
    const q = query.toLowerCase()
    return enriched.filter((m) => m.clientName.toLowerCase().includes(q) || m.planName.toLowerCase().includes(q))
  }, [enriched, query])

  const activeCount = enriched.filter((m) => m.status.label === 'Active').length
  const expiringCount = enriched.filter((m) => m.status.label === 'Expiring soon').length
  const membershipRevenue = clientMemberships.reduce((sum, m) => sum + (Number(m.amountPaid) || 0), 0)

  // ---- Plan handlers ----
  function openAddPlan() {
    setPlanForm(emptyPlanForm)
    setEditingPlanId(null)
    setPlanModalOpen(true)
  }

  function openEditPlan(p) {
    const f = getPlanDiscountFields(p)
    setPlanForm({
      name: p.name,
      price: p.price,
      validityMonths: p.validityMonths,
      discountPercentService: f.service || '',
      discountPercentProduct: f.product || '',
      birthdayDiscountPercentService: f.birthdayService || '',
      birthdayDiscountPercentProduct: f.birthdayProduct || '',
      anniversaryDiscountPercentService: f.anniversaryService || '',
      anniversaryDiscountPercentProduct: f.anniversaryProduct || '',
      description: p.description || '',
    })
    setEditingPlanId(p.id)
    setPlanModalOpen(true)
  }

  function handleSavePlan() {
    if (!planForm.name.trim() || !planForm.price) return
    upsertMembershipPlan({
      id: editingPlanId || uid('plan'),
      name: planForm.name,
      price: Number(planForm.price),
      validityMonths: Number(planForm.validityMonths) || 1,
      discountPercentService: Number(planForm.discountPercentService) || 0,
      discountPercentProduct: Number(planForm.discountPercentProduct) || 0,
      birthdayDiscountPercentService: Number(planForm.birthdayDiscountPercentService) || 0,
      birthdayDiscountPercentProduct: Number(planForm.birthdayDiscountPercentProduct) || 0,
      anniversaryDiscountPercentService: Number(planForm.anniversaryDiscountPercentService) || 0,
      anniversaryDiscountPercentProduct: Number(planForm.anniversaryDiscountPercentProduct) || 0,
      description: planForm.description,
    })
    setPlanModalOpen(false)
  }

  // ---- Enroll handlers ----
  function openEnroll() {
    setEnrollForm({
      ...emptyEnrollForm,
      planId: membershipPlans[0]?.id || '',
      startDate: new Date().toISOString().slice(0, 10),
    })
    setEnrollClientQuery('')
    setEnrollModalOpen(true)
  }

  function applyExistingClient(c) {
    setEnrollForm((s) => ({
      ...s,
      name: c.name,
      phone: c.phone || '',
      birthday: c.birthday || '',
      anniversary: c.anniversary || '',
    }))
    setEnrollClientQuery('')
  }

  function handleEnroll() {
    if (!enrollForm.name.trim() || !enrollForm.phone.trim() || !enrollForm.planId) return
    const plan = membershipPlans.find((p) => p.id === enrollForm.planId)
    if (!plan) return

    // Match an existing client by phone so we don't create duplicates;
    // otherwise this enrollment adds a new client to the directory.
    const existing = findClientByPhone(enrollForm.phone.trim())
    const clientId = existing?.id || uid('cli')
    upsertClient({
      id: clientId,
      name: enrollForm.name.trim(),
      phone: enrollForm.phone.trim(),
      gender: existing?.gender || 'Female',
      birthday: enrollForm.birthday || '',
      anniversary: enrollForm.anniversary || '',
    })

    const start = enrollForm.startDate ? new Date(enrollForm.startDate) : new Date()
    const expiry = new Date(start)
    expiry.setMonth(expiry.getMonth() + (Number(plan.validityMonths) || 1))

    const membership = {
      id: uid('cmem'),
      clientId,
      clientName: enrollForm.name.trim(),
      clientPhone: enrollForm.phone.trim(),
      planId: plan.id,
      planName: plan.name,
      amountPaid: plan.price,
      startDate: start.toISOString(),
      expiryDate: expiry.toISOString(),
    }
    enrollMembership(membership)
    setEnrollModalOpen(false)
    setEnrolledMembership({ membership, plan })
  }

  function handleRenew(member) {
    renewMembership(member.id, member.plan?.validityMonths || 1)
    setRenewTarget(null)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Loyalty"
        title="Memberships"
        subtitle={`${clientMemberships.length} membership${clientMemberships.length === 1 ? '' : 's'} sold · ${activeCount} active`}
        actions={
          tab === 'members' ? (
            <button className="btn-primary" onClick={openEnroll} disabled={membershipPlans.length === 0}>
              <Plus size={16} /> Enroll Member
            </button>
          ) : (
            <button className="btn-primary" onClick={openAddPlan}>
              <Plus size={16} /> Add Plan
            </button>
          )
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Active members" value={activeCount} icon={Crown} accent="plum" />
        <StatCard label="Expiring soon" value={expiringCount} icon={CalendarClock} accent="brass" />
        <StatCard label="Membership revenue" value={formatCurrency(membershipRevenue, settings.currencySymbol)} icon={UsersIcon} accent="success" />
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

      {tab === 'members' ? (
        <>
          <div className="relative mb-6 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="input pl-10"
              placeholder="Search by client or plan…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {filteredMembers.length === 0 ? (
            <EmptyState
              icon={Crown}
              title={clientMemberships.length === 0 ? 'No memberships yet' : 'No matches'}
              subtitle={
                clientMemberships.length === 0
                  ? membershipPlans.length === 0
                    ? 'Create a membership plan first, then enroll your clients.'
                    : 'Enroll your first client into a membership plan.'
                  : 'Try a different search term.'
              }
              action={
                clientMemberships.length === 0 &&
                membershipPlans.length > 0 && (
                  <button className="btn-primary" onClick={openEnroll}>
                    <Plus size={16} /> Enroll Member
                  </button>
                )
              }
            />
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-black/[0.02] text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold">Client</th>
                      <th className="text-left px-5 py-3 font-semibold">Plan</th>
                      <th className="text-left px-5 py-3 font-semibold">Expires</th>
                      <th className="text-left px-5 py-3 font-semibold">Status</th>
                      <th className="text-right px-5 py-3 font-semibold">Paid</th>
                      <th className="text-right px-5 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {filteredMembers.map((m) => (
                      <tr key={m.id} className="hover:bg-black/[0.015]">
                        <td className="px-5 py-3.5 font-medium text-ink">
                          {m.clientName}
                          {m.clientPhone && <span className="block text-xs text-muted font-normal">{m.clientPhone}</span>}
                        </td>
                        <td className="px-5 py-3.5 text-muted">
                          {m.planName}
                          {m.plan &&
                            (() => {
                              const f = getPlanDiscountFields(m.plan)
                              return f.service > 0 || f.product > 0 ? (
                                <span className="block text-xs text-brass-dark font-medium">
                                  {f.service}% off services · {f.product}% off products
                                </span>
                              ) : null
                            })()}
                        </td>
                        <td className="px-5 py-3.5 text-muted">{formatDate(m.expiryDate)}</td>
                        <td className="px-5 py-3.5">
                          <Badge tone={m.status.tone}>{m.status.label}</Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold tabular text-ink">
                          {formatCurrency(m.amountPaid, settings.currencySymbol)}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setRenewTarget(m)} className="p-1.5 text-muted hover:text-plum" title="Renew">
                              <RefreshCw size={15} />
                            </button>
                            <button onClick={() => setConfirmDeleteMember(m)} className="p-1.5 text-muted hover:text-danger" title="Remove">
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
        </>
      ) : (
        <>
          {membershipPlans.length === 0 ? (
            <EmptyState
              icon={Crown}
              title="No membership plans"
              subtitle="Create a plan to start enrolling clients."
              action={
                <button className="btn-primary" onClick={openAddPlan}>
                  <Plus size={16} /> Add Plan
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {membershipPlans.map((p) => {
                const f = getPlanDiscountFields(p)
                const hasBirthdayBonus = f.birthdayService > 0 || f.birthdayProduct > 0
                const hasAnniversaryBonus = f.anniversaryService > 0 || f.anniversaryProduct > 0
                return (
                  <div key={p.id} className="card p-5 flex flex-col">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-full bg-brass/15 text-brass-dark flex items-center justify-center shrink-0">
                        <Crown size={18} />
                      </div>
                      <Badge tone="plum">
                        {f.service}% svc · {f.product}% prod
                      </Badge>
                    </div>
                    <p className="font-display text-lg text-ink mb-1">{p.name}</p>
                    <p className="text-xs text-muted mb-3">{p.description || 'No description added.'}</p>
                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                      <div className="bg-black/[0.02] rounded-lg p-2.5">
                        <p className="text-muted mb-0.5">Price</p>
                        <p className="font-semibold text-ink tabular">{formatCurrency(p.price, settings.currencySymbol)}</p>
                      </div>
                      <div className="bg-black/[0.02] rounded-lg p-2.5">
                        <p className="text-muted mb-0.5">Validity</p>
                        <p className="font-semibold text-ink tabular">{p.validityMonths} month</p>
                      </div>
                    </div>
                    {(hasBirthdayBonus || hasAnniversaryBonus) && (
                      <div className="mb-4 text-[11px] text-brass-dark bg-brass/10 rounded-lg p-2.5 space-y-0.5">
                        {hasBirthdayBonus && (
                          <p>
                            🎂 Birthday week: +{f.birthdayService}% svc · +{f.birthdayProduct}% prod
                          </p>
                        )}
                        {hasAnniversaryBonus && (
                          <p>
                            💍 Anniversary week: +{f.anniversaryService}% svc · +{f.anniversaryProduct}% prod
                          </p>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-auto pt-3 border-t border-black/5">
                      <button onClick={() => openEditPlan(p)} className="btn-ghost text-xs py-1.5 flex-1">
                        <Pencil size={13} /> Edit
                      </button>
                      <button onClick={() => setConfirmDeletePlan(p)} className="btn-danger text-xs py-1.5 flex-1">
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Add / edit plan */}
      <Modal open={planModalOpen} onClose={() => setPlanModalOpen(false)} title={editingPlanId ? 'Edit plan' : 'Add plan'}>
        <div className="space-y-3">
          <div>
            <label className="label">Plan name</label>
            <input className="input" value={planForm.name} onChange={(e) => setPlanForm((s) => ({ ...s, name: e.target.value }))} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Price ({settings.currencySymbol})</label>
              <input
                className="input"
                type="number"
                min="0"
                value={planForm.price}
                onChange={(e) => setPlanForm((s) => ({ ...s, price: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Validity (months)</label>
              <input
                className="input"
                type="number"
                min="1"
                value={planForm.validityMonths}
                onChange={(e) => setPlanForm((s) => ({ ...s, validityMonths: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <p className="label mb-1.5">Membership discount</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-[11px]">On services (%)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="100"
                  value={planForm.discountPercentService}
                  onChange={(e) => setPlanForm((s) => ({ ...s, discountPercentService: e.target.value }))}
                />
              </div>
              <div>
                <label className="label text-[11px]">On products (%)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="100"
                  value={planForm.discountPercentProduct}
                  onChange={(e) => setPlanForm((s) => ({ ...s, discountPercentProduct: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-black/5 p-3 space-y-3 bg-black/[0.015]">
            <p className="text-xs font-semibold text-ink flex items-center gap-1.5">🎂 Extra discount on birthday week</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-[11px]">On services (%)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="100"
                  value={planForm.birthdayDiscountPercentService}
                  onChange={(e) => setPlanForm((s) => ({ ...s, birthdayDiscountPercentService: e.target.value }))}
                />
              </div>
              <div>
                <label className="label text-[11px]">On products (%)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="100"
                  value={planForm.birthdayDiscountPercentProduct}
                  onChange={(e) => setPlanForm((s) => ({ ...s, birthdayDiscountPercentProduct: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-black/5 p-3 space-y-3 bg-black/[0.015]">
            <p className="text-xs font-semibold text-ink flex items-center gap-1.5">💍 Extra discount on anniversary week</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-[11px]">On services (%)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="100"
                  value={planForm.anniversaryDiscountPercentService}
                  onChange={(e) => setPlanForm((s) => ({ ...s, anniversaryDiscountPercentService: e.target.value }))}
                />
              </div>
              <div>
                <label className="label text-[11px]">On products (%)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="100"
                  value={planForm.anniversaryDiscountPercentProduct}
                  onChange={(e) => setPlanForm((s) => ({ ...s, anniversaryDiscountPercentProduct: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="label">Description (optional)</label>
            <textarea
              className="input"
              rows={2}
              placeholder="What's included in this plan…"
              value={planForm.description}
              onChange={(e) => setPlanForm((s) => ({ ...s, description: e.target.value }))}
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={() => setPlanModalOpen(false)} className="btn-ghost">
              Cancel
            </button>
            <button onClick={handleSavePlan} className="btn-primary" disabled={!planForm.name.trim() || !planForm.price}>
              Save plan
            </button>
          </div>
        </div>
      </Modal>

      {/* Enroll member */}
      <Modal open={enrollModalOpen} onClose={() => setEnrollModalOpen(false)} title="Enroll member">
        <div className="space-y-3">
          <div>
            <label className="label">Find existing client (optional)</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                className="input pl-9"
                placeholder="Search by name or phone…"
                value={enrollClientQuery}
                onChange={(e) => setEnrollClientQuery(e.target.value)}
              />
            </div>
            {enrollClientMatches.length > 0 && (
              <div className="border border-black/10 rounded-lg divide-y divide-black/5 mt-1.5 overflow-hidden">
                {enrollClientMatches.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => applyExistingClient(c)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-black/[0.03] text-left text-sm"
                  >
                    <span className="font-medium text-ink">{c.name}</span>
                    <span className="text-xs text-muted ml-auto">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Full name</label>
              <input
                className="input"
                value={enrollForm.name}
                onChange={(e) => setEnrollForm((s) => ({ ...s, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Contact number</label>
              <input
                className="input"
                value={enrollForm.phone}
                onChange={(e) => setEnrollForm((s) => ({ ...s, phone: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Birthday</label>
              <input
                className="input"
                type="date"
                value={enrollForm.birthday}
                onChange={(e) => setEnrollForm((s) => ({ ...s, birthday: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Anniversary</label>
              <input
                className="input"
                type="date"
                value={enrollForm.anniversary}
                onChange={(e) => setEnrollForm((s) => ({ ...s, anniversary: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Plan</label>
              <select className="input" value={enrollForm.planId} onChange={(e) => setEnrollForm((s) => ({ ...s, planId: e.target.value }))}>
                <option value="">Select a plan…</option>
                {membershipPlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatCurrency(p.price, settings.currencySymbol)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Start date</label>
              <input
                className="input"
                type="date"
                value={enrollForm.startDate}
                onChange={(e) => setEnrollForm((s) => ({ ...s, startDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={() => setEnrollModalOpen(false)} className="btn-ghost">
              Cancel
            </button>
            <button
              onClick={handleEnroll}
              className="btn-primary"
              disabled={!enrollForm.name.trim() || !enrollForm.phone.trim() || !enrollForm.planId}
            >
              Enroll
            </button>
          </div>
        </div>
      </Modal>

      {/* Enrollment success + WhatsApp share */}
      <Modal open={!!enrolledMembership} onClose={() => setEnrolledMembership(null)} title="Member enrolled" size="sm">
        {enrolledMembership && (
          <div>
            <div className="flex items-center gap-2 mb-4 text-success text-sm font-medium">
              <Check size={16} /> {enrolledMembership.membership.clientName} is now enrolled
            </div>
            <div className="rounded-lg bg-black/[0.02] p-3.5 mb-5 text-sm space-y-1">
              <p className="font-semibold text-ink flex items-center gap-1.5">
                <Crown size={14} className="text-brass-dark" /> {enrolledMembership.plan.name}
              </p>
              <p className="text-muted text-xs">Valid till {formatDate(enrolledMembership.membership.expiryDate)}</p>
              <p className="text-muted text-xs">
                Amount paid: {formatCurrency(enrolledMembership.membership.amountPaid, settings.currencySymbol)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {enrolledMembership.membership.clientPhone && (
                <a
                  href={whatsappLink(
                    enrolledMembership.membership.clientPhone,
                    whatsappMembershipMessage(settings, enrolledMembership.membership, enrolledMembership.plan),
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-brass"
                >
                  <Share2 size={15} /> Share on WhatsApp
                </a>
              )}
              <button onClick={() => setEnrolledMembership(null)} className="btn-primary ml-auto">
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Renew confirm */}
      <Modal open={!!renewTarget} onClose={() => setRenewTarget(null)} title="Renew membership" size="sm">
        {renewTarget && (
          <div>
            <p className="text-sm text-muted mb-5">
              Extend <span className="font-semibold text-ink">{renewTarget.clientName}</span>'s {renewTarget.planName} by{' '}
              {renewTarget.plan?.validityMonths || 1} month{(renewTarget.plan?.validityMonths || 1) === 1 ? '' : 's'}, starting from today or
              their current expiry — whichever is later.
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setRenewTarget(null)} className="btn-ghost">
                Cancel
              </button>
              <button onClick={() => handleRenew(renewTarget)} className="btn-primary">
                Renew
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete plan confirm */}
      <Modal open={!!confirmDeletePlan} onClose={() => setConfirmDeletePlan(null)} title="Remove plan?" size="sm">
        {confirmDeletePlan && (
          <div>
            <p className="text-sm text-muted mb-5">
              Remove <span className="font-semibold text-ink">{confirmDeletePlan.name}</span>? Clients already enrolled keep their membership
              record.
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setConfirmDeletePlan(null)} className="btn-ghost">
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteMembershipPlan(confirmDeletePlan.id)
                  setConfirmDeletePlan(null)
                }}
                className="btn-danger"
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete member confirm */}
      <Modal open={!!confirmDeleteMember} onClose={() => setConfirmDeleteMember(null)} title="Remove membership?" size="sm">
        {confirmDeleteMember && (
          <div>
            <p className="text-sm text-muted mb-5">
              Remove <span className="font-semibold text-ink">{confirmDeleteMember.clientName}</span>'s {confirmDeleteMember.planName}{' '}
              membership?
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setConfirmDeleteMember(null)} className="btn-ghost">
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteMembership(confirmDeleteMember.id)
                  setConfirmDeleteMember(null)
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
