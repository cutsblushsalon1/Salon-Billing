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
import { useNavigate } from 'react-router-dom'
import { CalendarRange, TrendingUp, Users, Users2, Scissors, CreditCard, X, Repeat, AlertTriangle, Sparkles, ArrowRight } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { PageHeader, StatCard, EmptyState, Badge } from '../components/ui.jsx'
import {
  formatCurrency,
  formatDate,
  isInRange,
  isSameMonth,
  calcBillItemRevenue,
  getBillStaffNames,
  computeClientInsights,
  getClientSegment,
} from '../utils/helpers.js'

const TABS = [
  { id: 'revenue', label: 'Revenue', icon: TrendingUp },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'insights', label: 'Customer Insights', icon: Repeat },
  { id: 'services', label: 'Services', icon: Scissors },
  { id: 'staff', label: 'Staff', icon: Users2 },
  { id: 'payments', label: 'Payments', icon: CreditCard },
]

const PIE_COLORS = ['#5B2333', '#C79A4B', '#2F7D5E', '#8A8290']

export default function Reports() {
  const { bills, clients, settings } = useApp()
  const navigate = useNavigate()
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

  // ---- Customer insights: how often people come back, what they're worth
  // per visit, and who's drifting away with money still "on the table". ----
  const clientsWithVisits = useMemo(() => clients.filter((c) => (c.visits || []).length > 0), [clients])

  const clientInsights = useMemo(
    () =>
      clientsWithVisits
        .map((c) => ({ client: c, insights: computeClientInsights(c), segment: getClientSegment(c) }))
        .sort((a, b) => b.insights.totalSpent - a.insights.totalSpent),
    [clientsWithVisits],
  )

  const repeatClients = useMemo(() => clientsWithVisits.filter((c) => (c.visits || []).length > 1), [clientsWithVisits])

  const repeatRate = clientsWithVisits.length ? Math.round((repeatClients.length / clientsWithVisits.length) * 100) : 0

  const avgVisitsPerClient = clientsWithVisits.length
    ? (clientsWithVisits.reduce((s, c) => s + (c.visits || []).length, 0) / clientsWithVisits.length).toFixed(1)
    : '0'

  const avgSpendPerVisit = useMemo(() => {
    const totalVisits = clientsWithVisits.reduce((s, c) => s + (c.visits || []).length, 0)
    const totalSpent = clientsWithVisits.reduce((s, c) => s + (c.totalSpent || 0), 0)
    return totalVisits ? totalSpent / totalVisits : 0
  }, [clientsWithVisits])

  // Median (not mean) gap between visits across clients who have one. With
  // only a handful of repeat clients, a plain average is easily dragged
  // down by one or two clients billed twice in quick succession (e.g. while
  // testing) — the median is far less sensitive to that kind of outlier,
  // and we surface the sample size so the number is never a mystery.
  const avgReturnDays = useMemo(() => {
    const gaps = clientInsights
      .map((c) => c.insights.avgDaysBetweenVisits)
      .filter((d) => d !== null)
      .sort((a, b) => a - b)
    if (gaps.length === 0) return null
    const mid = Math.floor(gaps.length / 2)
    const median = gaps.length % 2 !== 0 ? gaps[mid] : Math.round((gaps[mid - 1] + gaps[mid]) / 2)
    return { days: median, sampleSize: gaps.length }
  }, [clientInsights])

  const atRiskClients = useMemo(
    () =>
      clientInsights
        .filter((c) => c.segment.label === 'At risk' || c.segment.label === 'Lapsed')
        .sort((a, b) => b.insights.totalSpent - a.insights.totalSpent),
    [clientInsights],
  )

  const revenueAtRisk = useMemo(
    () => atRiskClients.reduce((s, c) => s + c.insights.avgSpendPerVisit, 0),
    [atRiskClients],
  )

  // New vs. returning revenue, month by month - the clearest signal of
  // whether growth is coming from fresh footfall or from clients coming
  // back, which is what a retention push (Follow-ups) actually moves.
  const growthData = useMemo(() => {
    const firstVisitByClient = {}
    clients.forEach((c) => {
      const sorted = [...(c.visits || [])].sort((a, b) => new Date(a.date) - new Date(b.date))
      if (sorted[0]) firstVisitByClient[c.id] = sorted[0].date
    })

    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const monthBills = bills.filter((b) => isSameMonth(b.date, d))
      let newRevenue = 0
      let returningRevenue = 0
      monthBills.forEach((b) => {
        const clientId = b.client?.id
        const firstVisit = clientId ? firstVisitByClient[clientId] : null
        const isFirstVisit = firstVisit && isSameMonth(firstVisit, new Date(b.date))
        if (!clientId || isFirstVisit) newRevenue += b.total
        else returningRevenue += b.total
      })
      months.push({
        month: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        New: Math.round(newRevenue),
        Returning: Math.round(returningRevenue),
      })
    }
    return months
  }, [bills, clients])

  const serviceStats = useMemo(() => {
    const map = {}
    scopedBills.forEach((b) => {
      const effectiveRevenues = calcBillItemRevenue(b)
      b.items.forEach((it, idx) => {
        if (it.type !== 'service') return
        if (!map[it.name]) map[it.name] = { name: it.name, count: 0, revenue: 0 }
        map[it.name].count += it.qty
        map[it.name].revenue += effectiveRevenues[idx]
      })
    })
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 10)
  }, [scopedBills])

  const staffStats = useMemo(() => {
    const map = {}
    scopedBills.forEach((b) => {
      const hasStaffedItems = b.items?.some((it) => it.staffName)
      if (hasStaffedItems) {
        // Effective revenue already has item-level AND whole-bill discounts
        // proportionally removed, so multi-staff bills split fairly.
        const effectiveRevenues = calcBillItemRevenue(b)
        b.items.forEach((it, idx) => {
          if (!it.staffName) return
          const revenue = effectiveRevenues[idx]
          if (!map[it.staffName]) map[it.staffName] = { name: it.staffName, count: 0, revenue: 0 }
          map[it.staffName].count += 1
          map[it.staffName].revenue += revenue
        })
      } else {
        // Legacy bills created before per-item staff assignment existed
        getBillStaffNames(b).forEach((name) => {
          if (!map[name]) map[name] = { name, count: 0, revenue: 0 }
          map[name].count += 1
          map[name].revenue += b.total
        })
      }
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

      {tab === 'insights' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Repeat customer rate" value={`${repeatRate}%`} icon={Repeat} accent="plum" trend={`${repeatClients.length} of ${clientsWithVisits.length} clients return`} />
            <StatCard label="Avg. visits per client" value={avgVisitsPerClient} icon={Users} accent="brass" />
            <StatCard label="Avg. spend per visit" value={formatCurrency(avgSpendPerVisit, settings.currencySymbol)} icon={TrendingUp} accent="success" />
            <StatCard
              label="Revenue at risk"
              value={formatCurrency(revenueAtRisk, settings.currencySymbol)}
              icon={AlertTriangle}
              accent="danger"
              trend={`${atRiskClients.length} client${atRiskClients.length === 1 ? '' : 's'} overdue to return`}
            />
          </div>

          {avgReturnDays && avgReturnDays.sampleSize >= 3 && (
            <div className="card p-4 sm:p-5 flex items-start gap-3 bg-plum/5 border-plum/10">
              <Sparkles size={16} className="text-plum mt-0.5 shrink-0" />
              <p className="text-sm text-ink">
                Based on <span className="font-semibold">{avgReturnDays.sampleSize} repeat clients</span>, the typical gap between
                visits is <span className="font-semibold">{avgReturnDays.days} days</span>. Use this as a benchmark in{' '}
                <span className="font-semibold">Settings → Follow-up days</span> so reminders fire right before clients would
                naturally drift off.
              </p>
            </div>
          )}
          {avgReturnDays && avgReturnDays.sampleSize > 0 && avgReturnDays.sampleSize < 3 && (
            <div className="card p-4 sm:p-5 flex items-start gap-3 bg-black/[0.02] border-black/5">
              <Sparkles size={16} className="text-muted mt-0.5 shrink-0" />
              <p className="text-sm text-muted">
                Only <span className="font-semibold text-ink">{avgReturnDays.sampleSize}</span> client
                {avgReturnDays.sampleSize === 1 ? ' has' : 's have'} enough visit history to estimate a return cadence so far — too
                few to trust as a benchmark yet. This will get more reliable as more repeat visits come in.
              </p>
            </div>
          )}

          <div className="card p-5 sm:p-6">
            <p className="font-display text-lg text-ink mb-1">New vs. returning revenue</p>
            <p className="text-xs text-muted mb-4">Last 6 months — a rising "Returning" share means retention is doing the work.</p>
            {bills.length === 0 ? (
              <EmptyState icon={TrendingUp} title="No revenue data yet" subtitle="Generate a few bills to see this breakdown." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={growthData} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F142012" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8A8290' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#8A8290' }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip
                    formatter={(v) => formatCurrency(v, settings.currencySymbol)}
                    contentStyle={{ borderRadius: 10, border: '1px solid #1F142014', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="New" stackId="rev" fill="#C79A4B" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Returning" stackId="rev" fill="#5B2333" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card p-5 sm:p-6">
            <div className="flex items-center justify-between mb-1 gap-3 flex-wrap">
              <p className="font-display text-lg text-ink">Client visit cadence</p>
              {atRiskClients.length > 0 && (
                <button onClick={() => navigate('/follow-ups')} className="btn-brass text-xs py-1.5 px-3">
                  Send follow-ups <ArrowRight size={13} />
                </button>
              )}
            </div>
            <p className="text-xs text-muted mb-4">How often each client returns, and what they're worth per visit.</p>
            {clientInsights.length === 0 ? (
              <EmptyState icon={Users} title="No visit history yet" subtitle="Once clients have billed visits, their cadence and value show up here." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted border-b border-black/5">
                      <th className="py-2 pr-3">Client</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Visits</th>
                      <th className="py-2 pr-3">Avg. days between visits</th>
                      <th className="py-2 pr-3">Avg. spend / visit</th>
                      <th className="py-2 pr-3">Total spent</th>
                      <th className="py-2">Last visit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {clientInsights.slice(0, 25).map(({ client: c, insights, segment }) => (
                      <tr key={c.id}>
                        <td className="py-2.5 pr-3 font-medium text-ink whitespace-nowrap">{c.name}</td>
                        <td className="py-2.5 pr-3">
                          <Badge tone={segment.tone}>{segment.label}</Badge>
                        </td>
                        <td className="py-2.5 pr-3 tabular">{insights.visitCount}</td>
                        <td className="py-2.5 pr-3 tabular">{insights.avgDaysBetweenVisits !== null ? `${insights.avgDaysBetweenVisits}d` : '—'}</td>
                        <td className="py-2.5 pr-3 tabular">{formatCurrency(insights.avgSpendPerVisit, settings.currencySymbol)}</td>
                        <td className="py-2.5 pr-3 tabular font-semibold">{formatCurrency(insights.totalSpent, settings.currencySymbol)}</td>
                        <td className="py-2.5 whitespace-nowrap text-muted">{insights.lastVisit ? formatDate(insights.lastVisit) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {clientInsights.length > 25 && (
                  <p className="text-xs text-muted mt-3">Showing top 25 of {clientInsights.length} clients by total spend.</p>
                )}
              </div>
            )}
          </div>
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
