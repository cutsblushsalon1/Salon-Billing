import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Phone,
  Mail,
  Receipt,
  Calendar,
  TrendingUp,
  StickyNote,
  Crown,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { EmptyState, Badge } from '../components/ui.jsx'
import {
  formatCurrency,
  formatDateTime,
  formatDate,
  getMembershipStatus,
  getPlanDiscountFields,
} from '../utils/helpers.js'

export default function ClientProfile() {
  const { id } = useParams()
  const { clients, bills, settings, clientMemberships, membershipPlans } = useApp()
  const navigate = useNavigate()

  const client = clients.find((c) => c.id === id)

  // Most recently enrolled membership for this client, if any.
  const membership = clientMemberships
    .filter((m) => m.clientId === id)
    .sort((a, b) => new Date(b.enrolledAt || 0) - new Date(a.enrolledAt || 0))[0]
  const membershipStatus = membership ? getMembershipStatus(membership.expiryDate) : null
  const membershipPlan = membership ? membershipPlans.find((p) => p.id === membership.planId) : null

  const clientBills = bills
    .filter((b) => b.client?.id === id)
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  if (!client) {
    return (
      <div>
        <button
          onClick={() => navigate('/clients')}
          className="text-sm text-plum flex items-center gap-1 mb-6 hover:underline"
        >
          <ArrowLeft size={14} /> Back to clients
        </button>

        <EmptyState
          icon={Receipt}
          title="Client not found"
          subtitle="This client may have been removed."
        />
      </div>
    )
  }

  // Use imported visit count when available.
  // Fall back to the number of bills for older clients.
  const visitCount =
    typeof client.visitCount === 'number'
      ? client.visitCount
      : Array.isArray(client.visits)
        ? client.visits.length
        : clientBills.length

  const totalSpent = Number(client.totalSpent) || 0

  const avgSpend = visitCount > 0
    ? totalSpent / visitCount
    : 0

  return (
    <div>
      {/* Back */}
      <button
        onClick={() => navigate('/clients')}
        className="text-sm text-plum flex items-center gap-1 mb-6 hover:underline"
      >
        <ArrowLeft size={14} /> Back to clients
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-plum text-cream flex items-center justify-center text-xl font-semibold">
            {client.name[0]?.toUpperCase()}
          </div>

          <div>
            <h1 className="font-display text-2xl text-ink">
              {client.name}
            </h1>

            <div className="flex items-center gap-3 text-sm text-muted mt-0.5 flex-wrap">
              {client.phone && (
                <span className="flex items-center gap-1">
                  <Phone size={13} /> {client.phone}
                </span>
              )}

              {client.email && (
                <span className="flex items-center gap-1">
                  <Mail size={13} /> {client.email}
                </span>
              )}

              <Badge tone="plum">
                {client.gender || 'Unisex'}
              </Badge>

              {membership && (
                <Badge tone={membershipStatus.tone}>
                  <Crown size={11} /> {membership.planName} · {membershipStatus.label}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() =>
            navigate('/new-bill', {
              state: { clientId: client.id },
            })
          }
          className="btn-primary"
        >
          <Receipt size={16} /> New Bill
        </button>
      </div>

      {/* Client Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

        {/* Total Spent */}
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1.5">
            Total spent
          </p>

          <p className="font-display text-xl text-ink tabular">
            {formatCurrency(
              totalSpent,
              settings.currencySymbol
            )}
          </p>
        </div>

        {/* Visits */}
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1.5">
            Visits
          </p>

          <p className="font-display text-xl text-ink tabular">
            {visitCount}
          </p>
        </div>

        {/* Average Spend */}
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1.5">
            Avg. spend / visit
          </p>

          <p className="font-display text-xl text-ink tabular">
            {formatCurrency(
              Math.round(avgSpend),
              settings.currencySymbol
            )}
          </p>
        </div>

        {/* Last Visit */}
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1.5">
            Last visit
          </p>

          <p className="font-display text-xl text-ink">
            {client.lastVisit
              ? formatDate(client.lastVisit)
              : '—'}
          </p>
        </div>
      </div>

      {/* Customer Value / Follow-up / Membership Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-brass-dark" />

            <p className="text-sm font-semibold text-ink">
              Customer value
            </p>
          </div>

          <p className="text-xs text-muted">
            {visitCount > 0
              ? `Average customer spend is ${formatCurrency(
                  Math.round(avgSpend),
                  settings.currencySymbol
                )} per visit.`
              : 'No visit data available yet.'}
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={16} className="text-brass-dark" />

            <p className="text-sm font-semibold text-ink">
              Follow-up status
            </p>
          </div>

          <p className="text-xs text-muted">
            {client.lastVisit
              ? `Last visited ${formatDate(client.lastVisit)}.`
              : 'No last visit date available.'}
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Crown size={16} className="text-brass-dark" />

            <p className="text-sm font-semibold text-ink">
              Membership
            </p>
          </div>

          {membership ? (
            <p className="text-xs text-muted">
              {membership.planName}
              {membershipPlan
                ? (() => {
                    const f = getPlanDiscountFields(membershipPlan)
                    return f.service || f.product ? ` (${f.service}% off services, ${f.product}% off products)` : ''
                  })()
                : ''}{' '}
              {membershipStatus.label === 'Expired' ? 'expired' : 'expires'} {formatDate(membership.expiryDate)}.{' '}
              <button onClick={() => navigate('/memberships')} className="text-plum hover:underline">
                Manage
              </button>
            </p>
          ) : (
            <p className="text-xs text-muted">
              Not enrolled in a membership yet.{' '}
              <button onClick={() => navigate('/memberships')} className="text-plum hover:underline">
                Enroll now
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Notes */}
      {client.notes && (
        <div className="card p-4 mb-6 flex items-start gap-3">
          <StickyNote
            size={16}
            className="text-brass-dark mt-0.5 shrink-0"
          />

          <p className="text-sm text-ink">
            {client.notes}
          </p>
        </div>
      )}

      {/* Visit History */}
      <p className="font-display text-lg text-ink mb-3">
        Visit history
      </p>

      {clientBills.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No bill history"
          subtitle={
            visitCount > 0
              ? `This client has ${visitCount} recorded visits, but individual bills are not available in this account.`
              : 'Bills for this client will show up here.'
          }
        />
      ) : (
        <div className="card divide-y divide-black/5">
          {clientBills.map((b) => (
            <div
              key={b.id}
              className="p-4 sm:p-5 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                  {b.billNo}
                </p>

                <p className="text-xs text-muted">
                  {formatDateTime(b.date)}
                </p>

                <p className="text-xs text-muted mt-1 truncate">
                  {b.items
                    .map((i) => i.name)
                    .join(', ')}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="font-semibold tabular text-ink">
                  {formatCurrency(
                    b.total,
                    settings.currencySymbol
                  )}
                </p>

                <Badge tone="brass">
                  {b.paymentMethod}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}