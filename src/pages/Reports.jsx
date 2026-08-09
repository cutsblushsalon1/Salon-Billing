import React, { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { CalendarRange, TrendingUp, Users, Users2, Scissors, CreditCard, X } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { PageHeader, StatCard, EmptyState } from '../components/ui.jsx'
import { formatCurrency, formatDate, isInRange, isSameMonth } from '../utils/helpers.js'

const TABS = [
  { id: 'revenue', label: 'Revenue', icon: TrendingUp },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'services', label: 'Services', icon: Scissors },
  { id: 'staff', label: 'Staff', icon: Users2 },
  { id: 'payments', label: 'Payments', icon: CreditCard },
]

const PIE_COLORS = ['#5B2333', '#C79A4B', '#2F7D5E', '#8A8290']

export default function Reports() {
  const { bills, clients, settings } = useApp()
  const [tab, setTab] = useState('revenue')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const scopedBills = useMemo(() => {
    if (!startDate && !endDate) return bills
    return bills.filter((b) => isInRange(b.date, startDate, endDate))
  }, [bills, startDate, endDate])

  const scopedTotal = scopedBills.reduce((s, b) => s + b.total, 0)

  const monthlyData = useMemo(() => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const monthBills = bills.filter((b) => isSameMonth(b.date, d))
      months.push({
        month: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        revenue: monthBills.reduce((s, b) => s + b.total, 0),
        bills: monthBills.length,
      })
    }
    return months
  }, [bills])

  const topClients = useMemo(() => {
    return [...clients]
      .filter((c) => (c.totalSpent || 0) > 0)
      .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
      .slice(0, 8)
  }, [clients])

  const serviceStats = useMemo(() => {
    const map = {}
    scopedBills.forEach((b) =>
      b.items
        .filter((i) => i.type === 'service')
        .forEach((i) => {
          if (!map[i.name]) map[i.name] = { name: i.name, count: 0, revenue: 0 }
          map[i.name].count += i.qty
          map[i.name].revenue += i.price * i.qty
        }),
    )
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 10)
  }, [scopedBills])

  const staffStats = useMemo(() => {
    const map = {}
    scopedBills.forEach((b) => {
      if (!b.staff?.name) return
      if (!map[b.staff.name]) map[b.staff.name] = { name: b.staff.name, count: 0, revenue: 0 }
      map[b.staff.name].count += 1
      map[b.staff.name].revenue += b.total
    })
    return Object.values(map).sort((a, b) => b.revenue - a.revenue)
  }, [scopedBills])

  const paymentStats = useMemo(() => {
    const map = {}
    scopedBills.forEach((b) => {
      map[b.paymentMethod] = (map[b.paymentMethod] || 0) + b.total
    })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [scopedBills])

  return (
    <div>
      <PageHeader eyebrow="Insights" title="Reports" subtitle="Track revenue, client value, service performance, and payment mix." />

      {/* Date range */}
      <div className="card p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <CalendarRange size={16} className="text-muted shrink-0" />
          <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <span className="text-muted text-sm">to</span>
          <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('')
                setEndDate('')
              }}
              className="btn-ghost shrink-0"
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>
        <div className="text-sm">
          <span className="text-muted">
            {startDate || endDate ? 'Sales in range: ' : 'All-time sales: '}
          </span>
          <span className="font-semibold text-plum tabular">{formatCurrency(scopedTotal, settings.currencySymbol)}</span>
          <span className="text-muted"> ({scopedBills.length} bills)</span>
        </div>
      </div>

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

      {tab === 'revenue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Revenue in range" value={formatCurrency(scopedTotal, settings.currencySymbol)} icon={TrendingUp} accent="plum" />
            <StatCard
              label="Avg. bill in range"
              value={formatCurrency(scopedBills.length ? Math.round(scopedTotal / scopedBills.length) : 0, settings.currencySymbol)}
              icon={TrendingUp}
              accent="brass"
            />
            <StatCard label="Bills in range" value={scopedBills.length} icon={TrendingUp} accent="success" />
          </div>
          <div className="card p-5 sm:p-6">
            <p className="font-display text-lg text-ink mb-4">Monthly revenue (last 6 months)</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F142012" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8A8290' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#8A8290' }} axisLine={false} tickLine={false} width={50} />
                <Tooltip
                  formatter={(v) => formatCurrency(v, settings.currencySymbol)}
                  contentStyle={{ borderRadius: 10, border: '1px solid #1F142014', fontSize: 12 }}
                />
                <Bar dataKey="revenue" fill="#5B2333" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'clients' && (
        <div className="card p-5 sm:p-6">
          <p className="font-display text-lg text-ink mb-4">Top clients by spend</p>
          {topClients.length === 0 ? (
            <EmptyState icon={Users} title="No client spend yet" subtitle="Once bills are generated for clients, rankings appear here." />
          ) : (
            <div className="divide-y divide-black/5">
              {topClients.map((c, idx) => (
                <div key={c.id} className="flex items-center gap-3 py-3">
                  <span className="w-6 h-6 rounded-full bg-brass/15 text-brass-dark text-xs font-semibold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{c.name}</p>
                    <p className="text-xs text-muted">{c.visits?.length || 0} visits</p>
                  </div>
                  <p className="text-sm font-semibold tabular text-ink">{formatCurrency(c.totalSpent || 0, settings.currencySymbol)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'services' && (
        <div className="card p-5 sm:p-6">
          <p className="font-display text-lg text-ink mb-1">Service performance</p>
          <p className="text-xs text-muted mb-4">Within selected date range</p>
          {serviceStats.length === 0 ? (
            <EmptyState icon={Scissors} title="No service data" subtitle="Bill some services to see performance data here." />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(260, serviceStats.length * 40)}>
              <BarChart data={serviceStats} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F142012" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#8A8290' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#1F1420' }} axisLine={false} tickLine={false} width={150} />
                <Tooltip
                  formatter={(v) => formatCurrency(v, settings.currencySymbol)}
                  contentStyle={{ borderRadius: 10, border: '1px solid #1F142014', fontSize: 12 }}
                />
                <Bar dataKey="revenue" fill="#C79A4B" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {tab === 'staff' && (
        <div className="card p-5 sm:p-6">
          <p className="font-display text-lg text-ink mb-1">Staff performance</p>
          <p className="text-xs text-muted mb-4">Revenue generated within selected date range</p>
          {staffStats.length === 0 ? (
            <EmptyState icon={Users2} title="No staff data" subtitle="Assign staff to bills to see performance here." />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(220, staffStats.length * 50)}>
              <BarChart data={staffStats} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F142012" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#8A8290' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#1F1420' }} axisLine={false} tickLine={false} width={130} />
                <Tooltip
                  formatter={(v) => formatCurrency(v, settings.currencySymbol)}
                  contentStyle={{ borderRadius: 10, border: '1px solid #1F142014', fontSize: 12 }}
                />
                <Bar dataKey="revenue" fill="#5B2333" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {tab === 'payments' && (
        <div className="card p-5 sm:p-6">
          <p className="font-display text-lg text-ink mb-1">Payment method mix</p>
          <p className="text-xs text-muted mb-4">Within selected date range</p>
          {paymentStats.length === 0 ? (
            <EmptyState icon={CreditCard} title="No payment data" subtitle="Generate bills to see payment method distribution." />
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ResponsiveContainer width="100%" height={260} className="sm:w-1/2">
                <PieChart>
                  <Pie data={paymentStats} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                    {paymentStats.map((entry, idx) => (
                      <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v, settings.currencySymbol)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2 w-full">
                {paymentStats
                  .sort((a, b) => b.value - a.value)
                  .map((p, idx) => (
                    <div key={p.name} className="flex items-center justify-between text-sm p-2.5 rounded-lg bg-black/[0.02]">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        {p.name}
                      </span>
                      <span className="font-semibold tabular">{formatCurrency(p.value, settings.currencySymbol)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
