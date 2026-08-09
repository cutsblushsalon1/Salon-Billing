import React from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Phone, Mail, Receipt, Calendar, TrendingUp, StickyNote } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { EmptyState, Badge } from '../components/ui.jsx'
import { formatCurrency, formatDateTime, formatDate } from '../utils/helpers.js'

export default function ClientProfile() {
  const { id } = useParams()
  const { clients, bills, settings } = useApp()
  const navigate = useNavigate()

  const client = clients.find((c) => c.id === id)
  const clientBills = bills.filter((b) => b.client?.id === id).sort((a, b) => new Date(b.date) - new Date(a.date))

  if (!client) {
    return (
      <div>
        <button onClick={() => navigate('/clients')} className="text-sm text-plum flex items-center gap-1 mb-6 hover:underline">
          <ArrowLeft size={14} /> Back to clients
        </button>
        <EmptyState icon={Receipt} title="Client not found" subtitle="This client may have been removed." />
      </div>
    )
  }

  const avgSpend = clientBills.length ? (client.totalSpent || 0) / clientBills.length : 0

  return (
    <div>
      <button onClick={() => navigate('/clients')} className="text-sm text-plum flex items-center gap-1 mb-6 hover:underline">
        <ArrowLeft size={14} /> Back to clients
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-plum text-cream flex items-center justify-center text-xl font-semibold">
            {client.name[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-2xl text-ink">{client.name}</h1>
            <div className="flex items-center gap-3 text-sm text-muted mt-0.5">
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
              <Badge tone="plum">{client.gender || 'Unisex'}</Badge>
            </div>
          </div>
        </div>
        <button onClick={() => navigate('/new-bill', { state: { clientId: client.id } })} className="btn-primary">
          <Receipt size={16} /> New Bill
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1.5">Total spent</p>
          <p className="font-display text-xl text-ink tabular">{formatCurrency(client.totalSpent || 0, settings.currencySymbol)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1.5">Visits</p>
          <p className="font-display text-xl text-ink tabular">{clientBills.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1.5">Avg. spend / visit</p>
          <p className="font-display text-xl text-ink tabular">{formatCurrency(Math.round(avgSpend), settings.currencySymbol)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1.5">Last visit</p>
          <p className="font-display text-xl text-ink">{client.lastVisit ? formatDate(client.lastVisit) : '—'}</p>
        </div>
      </div>

      {client.notes && (
        <div className="card p-4 mb-6 flex items-start gap-3">
          <StickyNote size={16} className="text-brass-dark mt-0.5 shrink-0" />
          <p className="text-sm text-ink">{client.notes}</p>
        </div>
      )}

      <p className="font-display text-lg text-ink mb-3">Visit history</p>
      {clientBills.length === 0 ? (
        <EmptyState icon={Calendar} title="No visits yet" subtitle="Bills for this client will show up here." />
      ) : (
        <div className="card divide-y divide-black/5">
          {clientBills.map((b) => (
            <div key={b.id} className="p-4 sm:p-5 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{b.billNo}</p>
                <p className="text-xs text-muted">{formatDateTime(b.date)}</p>
                <p className="text-xs text-muted mt-1 truncate">{b.items.map((i) => i.name).join(', ')}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold tabular text-ink">{formatCurrency(b.total, settings.currencySymbol)}</p>
                <Badge tone="brass">{b.paymentMethod}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
