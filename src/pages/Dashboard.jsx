import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import {
  IndianRupee,
  Users,
  Receipt,
  TrendingUp,
  Plus,
  UserPlus,
  Scissors,
  Package,
  ArrowUpRight,
  Bell,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { StatCard, PageHeader, EmptyState, Badge } from '../components/ui.jsx'
import { formatCurrency, formatDateTime, isSameDay, isSameMonth, daysSince } from '../utils/helpers.js'

export default function Dashboard() {
  const { bills, clients, settings, products, followUps, clientMemberships } = useApp()
  const navigate = useNavigate()
  const today = new Date()

  const todayBills = bills.filter((b) => isSameDay(b.date, today))
  const monthBills = bills.filter((b) => isSameMonth(b.date, today))

  // Membership sign-ups count toward revenue too, keyed off enrolledAt (the
  // date the membership was actually sold) rather than the bill date, since
  // enrollment doesn't necessarily go through a regular bill.
  const todayMemberships = clientMemberships.filter((m) => isSameDay(m.enrolledAt, today))
  const monthMemberships = clientMemberships.filter((m) => isSameMonth(m.enrolledAt, today))

  const todayBillRevenue = todayBills.reduce((s, b) => s + b.total, 0)
  const monthBillRevenue = monthBills.reduce((s, b) => s + b.total, 0)
  const todayMembershipRevenue = todayMemberships.reduce((s, m) => s + (Number(m.amountPaid) || 0), 0)
  const monthMembershipRevenue = monthMemberships.reduce((s, m) => s + (Number(m.amountPaid) || 0), 0)

  const todayRevenue = todayBillRevenue + todayMembershipRevenue
  const monthRevenue = monthBillRevenue + monthMembershipRevenue
  const avgBill = bills.length ? bills.reduce((s, b) => s + b.total, 0) / bills.length : 0

  const maleClients = clients.filter((c) => c.gender === 'Male').length
  const femaleClients = clients.filter((c) => c.gender === 'Female').length
  const otherClients = clients.length - maleClients - femaleClients

  const chartData = useMemo(() => {
    const days = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dayBills = bills.filter((b) => isSameDay(b.date, d))
      const dayMemberships = clientMemberships.filter((m) => isSameDay(m.enrolledAt, d))
      days.push({
        date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        revenue: dayBills.reduce((s, b) => s + b.total, 0) + dayMemberships.reduce((s, m) => s + (Number(m.amountPaid) || 0), 0),
      })
    }
    return days
  }, [bills, clientMemberships])

  const popularServices = useMemo(() => {
    const map = {}
    bills.forEach((b) =>
      b.items
        .filter((i) => i.type === 'service')
        .forEach((i) => {
          map[i.name] = (map[i.name] || 0) + i.qty
        }),
    )
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [bills])

  const lowStockCount = products.filter((p) => p.stock <= (p.lowStockAt ?? 5)).length
  const recentBills = bills.slice(0, 6)

  const dueForFollowUp = useMemo(() => {
    if (!settings.followUpEnabled) return 0
    return clients.filter((c) => {
      if (!c.lastVisit || !c.phone) return false
      if (daysSince(c.lastVisit) < (Number(settings.followUpDays) || 25)) return false
      const lastContact = followUps
        .filter((f) => f.clientId === c.id)
        .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))[0]
      return !lastContact || new Date(lastContact.sentAt) <= new Date(c.lastVisit)
    }).length
  }, [clients, followUps, settings.followUpEnabled, settings.followUpDays])

  return (
    <div>
      <PageHeader
        eyebrow="Today's Book"
        title="Dashboard"
        subtitle={today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        actions={
          <button className="btn-primary" onClick={() => navigate('/new-bill')}>
            <Plus size={16} /> New Bill
          </button>
        }
      />

      {/* Overview stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Today's Revenue"
          value={formatCurrency(todayRevenue, settings.currencySymbol)}
          icon={IndianRupee}
          trend={`${todayBills.length} bill${todayBills.length === 1 ? '' : 's'}${
            todayMemberships.length ? ` · ${todayMemberships.length} membership${todayMemberships.length === 1 ? '' : 's'}` : ''
          }`}
          accent="brass"
        />
        <StatCard
          label="This Month"
          value={formatCurrency(monthRevenue, settings.currencySymbol)}
          icon={TrendingUp}
          trend={`${monthBills.length} bill${monthBills.length === 1 ? '' : 's'}${
            monthMemberships.length ? ` · ${monthMemberships.length} membership${monthMemberships.length === 1 ? '' : 's'}` : ''
          }`}
          accent="plum"
        />
        <div className="card p-5">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Total Clients</p>
            <div className="w-10 h-10 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0">
              <Users size={18} />
            </div>
          </div>
          <p className="font-display text-2xl sm:text-3xl text-ink tabular mb-2">{clients.length}</p>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-plum" /> {femaleClients} female
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brass" /> {maleClients} male
            </span>
            {otherClients > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-muted" /> {otherClients} other
              </span>
            )}
          </div>
        </div>
        <StatCard
          label="Avg. Bill Value"
          value={formatCurrency(Math.round(avgBill), settings.currencySymbol)}
          icon={Receipt}
          trend={`${bills.length} total bills`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 card p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-display text-lg text-ink">Revenue trend</p>
              <p className="text-xs text-muted">Last 14 days</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ left: -20, right: 10, top: 10 }}>
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5B2333" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#5B2333" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F142012" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8A8290' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8A8290' }} axisLine={false} tickLine={false} width={50} />
              <Tooltip
                formatter={(v) => formatCurrency(v, settings.currencySymbol)}
                contentStyle={{ borderRadius: 10, border: '1px solid #1F142014', fontSize: 12 }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#5B2333" strokeWidth={2.5} fill="url(#revFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Popular services */}
        <div className="card p-5 sm:p-6">
          <p className="font-display text-lg text-ink mb-4">Popular services</p>
          {popularServices.length === 0 ? (
            <p className="text-sm text-muted">No bills yet — services will rank here as you bill clients.</p>
          ) : (
            <div className="space-y-3">
              {popularServices.map(([name, count], idx) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-brass/15 text-brass-dark text-xs font-semibold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{name}</p>
                    <div className="h-1.5 bg-black/5 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-brass rounded-full"
                        style={{ width: `${(count / popularServices[0][1]) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-muted tabular shrink-0">{count}x</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Recent bills */}
        <div className="lg:col-span-2 card p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="font-display text-lg text-ink">Recent bills</p>
            <button onClick={() => navigate('/history')} className="text-xs font-semibold text-plum flex items-center gap-1 hover:underline">
              View all <ArrowUpRight size={13} />
            </button>
          </div>
          {recentBills.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No bills yet"
              subtitle="Generate your first bill to see it appear here."
              action={
                <button className="btn-primary" onClick={() => navigate('/new-bill')}>
                  <Plus size={16} /> Create Bill
                </button>
              }
            />
          ) : (
            <div className="divide-y divide-black/5">
              {recentBills.map((b) => (
                <div key={b.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{b.client?.name || 'Walk-in'}</p>
                    <p className="text-xs text-muted">
                      {b.billNo} · {formatDateTime(b.date)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular text-ink">{formatCurrency(b.total, settings.currencySymbol)}</p>
                    <Badge tone="success">{b.paymentMethod}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="card p-5 sm:p-6">
          <p className="font-display text-lg text-ink mb-4">Quick actions</p>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction icon={Plus} label="New Bill" onClick={() => navigate('/new-bill')} />
            <QuickAction icon={UserPlus} label="Add Client" onClick={() => navigate('/clients')} />
            <QuickAction icon={Scissors} label="Add Service" onClick={() => navigate('/services')} />
            <QuickAction icon={Package} label="Stock" onClick={() => navigate('/products')} />
          </div>
          {dueForFollowUp > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-brass/10 text-brass-dark text-xs font-medium flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Bell size={13} /> {dueForFollowUp} client{dueForFollowUp > 1 ? 's' : ''} due for a follow-up
              </span>
              <button onClick={() => navigate('/follow-ups')} className="underline font-semibold">
                Review
              </button>
            </div>
          )}
          {lowStockCount > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-danger/10 text-danger text-xs font-medium flex items-center justify-between">
              <span>{lowStockCount} product{lowStockCount > 1 ? 's' : ''} running low</span>
              <button onClick={() => navigate('/products')} className="underline font-semibold">
                Review
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function QuickAction({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl border border-black/10 hover:border-brass hover:bg-brass/5 transition-colors text-ink"
    >
      <Icon size={18} className="text-plum" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}
