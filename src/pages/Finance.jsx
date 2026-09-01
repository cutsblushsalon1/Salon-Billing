import React, { useMemo, useState } from 'react'
import {
  BarChart3,
  CalendarRange,
  ChevronDown,
  Plus,
  Pencil,
  Receipt,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import { useApp } from '../context/AppContext.jsx'
import { PageHeader, StatCard, EmptyState } from '../components/ui.jsx'
import { formatCurrency, formatDate, isInRange, isSameMonth } from '../utils/helpers.js'

const CATEGORIES = [
  'Rent',
  'Salaries',
  'Electricity',
  'Water',
  'Internet',
  'Products & Supplies',
  'Marketing',
  'Maintenance',
  'Equipment',
  'Taxes & Fees',
  'Other',
]

const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Other']

function toDateInputValue(date) {
  const d = new Date(date)
  const offset = d.getTimezoneOffset()
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10)
}

function formatShortCurrency(value, symbol) {
  const n = Number(value) || 0
  if (Math.abs(n) >= 100000) return `${symbol}${(n / 100000).toFixed(1)}L`
  if (Math.abs(n) >= 1000) return `${symbol}${(n / 1000).toFixed(1)}K`
  return `${symbol}${Math.round(n)}`
}

function previousRange(startDate, endDate) {
  if (!startDate && !endDate) return null
  const start = startDate ? new Date(`${startDate}T00:00:00`) : new Date('2000-01-01T00:00:00')
  const end = endDate ? new Date(`${endDate}T23:59:59`) : new Date()
  const days = Math.max(1, Math.ceil((end - start) / 86400000) + 1)
  const previousEnd = new Date(start)
  previousEnd.setDate(previousEnd.getDate() - 1)
  const previousStart = new Date(previousEnd)
  previousStart.setDate(previousStart.getDate() - days + 1)
  return {
    start: toDateInputValue(previousStart),
    end: toDateInputValue(previousEnd),
  }
}

export default function Finance() {
  const { bills, expenses, addExpense, updateExpense, deleteExpense, settings } = useApp()
  const currency = settings.currencySymbol || '₹'

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingExpenseId, setEditingExpenseId] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [form, setForm] = useState({
    date: toDateInputValue(new Date()),
    category: 'Products & Supplies',
    description: '',
    amount: '',
    paymentMethod: 'UPI',
    notes: '',
  })

  const scopedBills = useMemo(
    () => (startDate || endDate ? bills.filter((b) => isInRange(b.date, startDate, endDate)) : bills),
    [bills, startDate, endDate],
  )

  const scopedExpenses = useMemo(
    () => (startDate || endDate ? expenses.filter((e) => isInRange(e.date, startDate, endDate)) : expenses),
    [expenses, startDate, endDate],
  )

  const revenue = useMemo(() => scopedBills.reduce((sum, bill) => sum + (Number(bill.total) || 0), 0), [scopedBills])
  const expenseTotal = useMemo(() => scopedExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0), [scopedExpenses])
  const netProfit = revenue - expenseTotal
  const netMargin = revenue ? (netProfit / revenue) * 100 : 0

  const previous = useMemo(() => {
    const range = previousRange(startDate, endDate)
    if (!range) return null
    const prevBills = bills.filter((b) => isInRange(b.date, range.start, range.end))
    const prevExpenses = expenses.filter((e) => isInRange(e.date, range.start, range.end))
    const prevRevenue = prevBills.reduce((sum, bill) => sum + (Number(bill.total) || 0), 0)
    const prevExpenseTotal = prevExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0)
    return { revenue: prevRevenue, expenses: prevExpenseTotal, profit: prevRevenue - prevExpenseTotal }
  }, [bills, expenses, startDate, endDate])

  // With no custom range, growth is current month vs previous month.
  const defaultGrowth = useMemo(() => {
    if (startDate || endDate) return null
    const now = new Date()
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const currentBills = bills.filter((b) => isSameMonth(b.date, now))
    const previousBills = bills.filter((b) => isSameMonth(b.date, prevMonth))
    const currentExpenses = expenses.filter((e) => isSameMonth(e.date, now))
    const previousExpenses = expenses.filter((e) => isSameMonth(e.date, prevMonth))
    const currentRevenue = currentBills.reduce((s, b) => s + (Number(b.total) || 0), 0)
    const previousRevenue = previousBills.reduce((s, b) => s + (Number(b.total) || 0), 0)
    const currentExpense = currentExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
    const previousExpense = previousExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
    return {
      revenue: previousRevenue ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : null,
      profit: previousRevenue - previousExpense
        ? ((currentRevenue - currentExpense - (previousRevenue - previousExpense)) / Math.abs(previousRevenue - previousExpense)) * 100
        : null,
    }
  }, [bills, expenses, startDate, endDate])

  const growth = previous
    ? {
        revenue: previous.revenue ? ((revenue - previous.revenue) / previous.revenue) * 100 : null,
        profit: previous.profit ? ((netProfit - previous.profit) / Math.abs(previous.profit)) * 100 : null,
      }
    : defaultGrowth

  const monthlyData = useMemo(() => {
    const months = []
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
      const startKey = toDateInputValue(monthStart)
      const endKey = toDateInputValue(monthEnd)
      const monthBills = bills.filter((b) => isInRange(b.date, startKey, endKey))
      const monthExpenses = expenses.filter((e) => isInRange(e.date, startKey, endKey))
      const monthRevenue = monthBills.reduce((s, b) => s + (Number(b.total) || 0), 0)
      const monthExpense = monthExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
      months.push({
        month: `${monthStart.getDate()} ${monthStart.toLocaleDateString('en-IN', { month: 'short' })} – ${monthEnd.getDate()} ${monthEnd.toLocaleDateString('en-IN', { month: 'short' })}`,
        revenue: Math.round(monthRevenue),
        expenses: Math.round(monthExpense),
        profit: Math.round(monthRevenue - monthExpense),
      })
    }
    return months
  }, [bills, expenses])

  const categoryData = useMemo(() => {
    const map = {}
    scopedExpenses.forEach((expense) => {
      map[expense.category] = (map[expense.category] || 0) + (Number(expense.amount) || 0)
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
  }, [scopedExpenses])

  const filteredExpenses = useMemo(
    () =>
      [...scopedExpenses]
        .filter((expense) => categoryFilter === 'All' || expense.category === categoryFilter)
        .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [scopedExpenses, categoryFilter],
  )

  function resetExpenseForm() {
    setForm({ date: toDateInputValue(new Date()), category: 'Products & Supplies', description: '', amount: '', paymentMethod: 'UPI', notes: '' })
    setEditingExpenseId(null)
    setShowForm(false)
  }

  function startEditExpense(expense) {
    setEditingExpenseId(expense.id)
    setForm({ date: toDateInputValue(expense.date), category: expense.category || 'Other', description: expense.description || '', amount: expense.amount ?? '', paymentMethod: expense.paymentMethod || 'Cash', notes: expense.notes || '' })
    setShowForm(true)
  }

  function submitExpense(e) {
    e.preventDefault()
    if (!form.description.trim() || Number(form.amount) <= 0) return
    const payload = { ...form, amount: Number(form.amount), date: `${form.date}T12:00:00` }
    if (editingExpenseId) updateExpense(editingExpenseId, payload)
    else addExpense(payload)
    resetExpenseForm()
  }

  const growthLabel = startDate || endDate ? 'vs. previous period' : 'vs. previous month'

  return (
    <div>
      <PageHeader
        eyebrow="Business health"
        title="Expenses & Profit"
        subtitle="See where your money goes, measure growth, and understand your real net profit."
        actions={
          <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} /> Add expense
          </button>
        }
      />

      <div className="card p-4 sm:p-5 mb-6 flex flex-col lg:flex-row lg:items-center gap-3">
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
        <div className="text-sm text-muted">
          {startDate || endDate ? 'Selected period' : 'All-time'} · {scopedBills.length} bills · {scopedExpenses.length} expenses
        </div>
      </div>

      {showForm && (
        <form onSubmit={submitExpense} className="card p-5 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-display text-lg text-ink">{editingExpenseId ? 'Edit expense' : 'Record an expense'}</p>
              <p className="text-xs text-muted mt-1">{editingExpenseId ? 'Correct the expense details and save the updated amount.' : 'Add rent, salaries, supplies, utilities, marketing, or any other salon cost.'}</p>
            </div>
            <button type="button" onClick={resetExpenseForm} className="text-muted hover:text-ink">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" required value={form.date} onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}>
                {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
            </div>
            <div className="lg:col-span-1">
              <label className="label">Description</label>
              <input className="input" required placeholder="e.g. Monthly rent" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
            </div>
            <div>
              <label className="label">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">{currency}</span>
                <input className="input pl-8" required min="0.01" step="0.01" type="number" value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Paid via</label>
              <select className="input" value={form.paymentMethod} onChange={(e) => setForm((s) => ({ ...s, paymentMethod: e.target.value }))}>
                {PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="label">Notes (optional)</label>
            <input className="input" placeholder="Optional details" value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} />
          </div>
          <div className="flex justify-end mt-4">
            <button className="btn-primary" type="submit">{editingExpenseId ? <Pencil size={15} /> : <Plus size={15} />} {editingExpenseId ? 'Update expense' : 'Save expense'}</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Revenue" value={formatCurrency(revenue, currency)} icon={TrendingUp} accent="success" />
        <StatCard label="Total expenses" value={formatCurrency(expenseTotal, currency)} icon={TrendingDown} accent="danger" />
        <StatCard
          label="Net profit"
          value={formatCurrency(netProfit, currency)}
          icon={Wallet}
          accent={netProfit >= 0 ? 'plum' : 'danger'}
          trend={`${netMargin.toFixed(1)}% net margin`}
        />
        <StatCard
          label="Revenue growth"
          value={growth.revenue === null || growth.revenue === undefined ? '—' : `${growth.revenue >= 0 ? '+' : ''}${growth.revenue.toFixed(1)}%`}
          icon={BarChart3}
          accent={growth.revenue === null || growth.revenue >= 0 ? 'brass' : 'danger'}
          trend={growthLabel}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <section className="card p-5 sm:p-6 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-display text-lg text-ink">Revenue vs. expenses vs. profit</p>
              <p className="text-xs text-muted mt-1">Six calendar months, 1st through last day</p>
            </div>
            <span className="text-xs text-muted">{growth.profit === null || growth.profit === undefined ? 'Profit growth: —' : `Profit growth: ${growth.profit >= 0 ? '+' : ''}${growth.profit.toFixed(1)}%`}</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData} margin={{ left: -20, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F142012" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8A8290' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8A8290' }} axisLine={false} tickLine={false} width={55} tickFormatter={(v) => formatShortCurrency(v, currency)} />
              <Tooltip formatter={(v) => formatCurrency(v, currency)} contentStyle={{ borderRadius: 10, border: '1px solid #1F142014', fontSize: 12 }} />
              <Legend />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#5B2333" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#C79A4B" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="profit" name="Net profit" stroke="#2F7D5E" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </section>

        <section className="card p-5 sm:p-6">
          <p className="font-display text-lg text-ink mb-1">Expense breakdown</p>
          <p className="text-xs text-muted mb-4">By category in the selected period</p>
          {categoryData.length === 0 ? (
            <EmptyState icon={Receipt} title="No expenses yet" subtitle="Record your first salon expense to see the breakdown." />
          ) : (
            <div className="space-y-3">
              {categoryData.slice(0, 8).map((item) => {
                const pct = expenseTotal ? (item.value / expenseTotal) * 100 : 0
                return (
                  <div key={item.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-ink">{item.name}</span>
                      <span className="font-semibold tabular">{formatCurrency(item.value, currency)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-black/5 overflow-hidden">
                      <div className="h-full bg-plum rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-muted mt-1">{pct.toFixed(1)}% of expenses</p>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <p className="font-display text-lg text-ink">Expense ledger</p>
            <p className="text-xs text-muted mt-1">Every recorded cost that is included in net profit.</p>
          </div>
          <div className="flex items-center gap-2">
            <select className="input !w-auto" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option>All</option>
              {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
            </select>
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <EmptyState icon={Wallet} title="No matching expenses" subtitle="Add an expense above to start tracking salon profitability." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-black/5">
                  <th className="py-3 pr-3">Date</th>
                  <th className="py-3 pr-3">Category</th>
                  <th className="py-3 pr-3">Description</th>
                  <th className="py-3 pr-3">Paid via</th>
                  <th className="py-3 pr-3 text-right">Amount</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-black/5 last:border-0">
                    <td className="py-3 pr-3 whitespace-nowrap">{formatDate(expense.date)}</td>
                    <td className="py-3 pr-3">{expense.category}</td>
                    <td className="py-3 pr-3">
                      <p className="text-ink">{expense.description}</p>
                      {expense.notes && <p className="text-[11px] text-muted mt-0.5">{expense.notes}</p>}
                    </td>
                    <td className="py-3 pr-3 text-muted">{expense.paymentMethod}</td>
                    <td className="py-3 pr-3 text-right font-semibold tabular">{formatCurrency(expense.amount, currency)}</td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end items-center gap-1">
                        <button className="p-2 rounded-lg text-muted hover:text-ink hover:bg-black/5" title="Edit expense" onClick={() => startEditExpense(expense)}>
                          <Pencil size={15} />
                        </button>
                        <button className="p-2 rounded-lg text-muted hover:text-danger hover:bg-danger/5" title="Delete expense" onClick={() => {
                          if (window.confirm(`Delete this ${formatCurrency(expense.amount, currency)} expense?`)) deleteExpense(expense.id)
                        }}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
