import React, { useMemo, useState } from 'react'
import { Search, Eye, Printer, Download, Share2, Trash2, Receipt, CalendarRange, X, Pencil } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { PageHeader, Modal, EmptyState, Badge } from '../components/ui.jsx'
import BillPreview from '../components/BillPreview.jsx'
import EditBillModal from '../components/EditBillModal.jsx'
import { formatCurrency, formatDateTime, isInRange, whatsappInvoiceMessage, whatsappLink, getBillStaffNames } from '../utils/helpers.js'
import { downloadBillPDF } from '../utils/pdf.js'

const PAYMENT_FILTERS = ['All', 'Cash', 'Card', 'UPI', 'Wallet']

export default function BillingHistory() {
  const { bills, settings, deleteBill } = useApp()
  const [query, setQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('All')
  const [viewBill, setViewBill] = useState(null)
  const [editBill, setEditBill] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const filtered = useMemo(() => {
    return bills.filter((b) => {
      const matchesQuery =
        !query.trim() ||
        b.billNo.toLowerCase().includes(query.toLowerCase()) ||
        (b.client?.name || '').toLowerCase().includes(query.toLowerCase()) ||
        (b.client?.phone || '').includes(query)
      const matchesDate = isInRange(b.date, startDate, endDate)
      const matchesPayment = paymentFilter === 'All' || b.paymentMethod === paymentFilter
      return matchesQuery && matchesDate && matchesPayment
    })
  }, [bills, query, startDate, endDate, paymentFilter])

  const filteredTotal = filtered.reduce((s, b) => s + b.total, 0)

  function clearFilters() {
    setQuery('')
    setStartDate('')
    setEndDate('')
    setPaymentFilter('All')
  }

  const hasFilters = query || startDate || endDate || paymentFilter !== 'All'

  return (
    <div>
      <PageHeader eyebrow="Records" title="Billing History" subtitle={`${bills.length} bills recorded in total`} />

      {/* Filters */}
      <div className="card p-4 sm:p-5 mb-6">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="input pl-10"
              placeholder="Search by bill no, client name or phone…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <CalendarRange size={16} className="text-muted shrink-0" />
            <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <span className="text-muted text-sm">to</span>
            <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <select className="input lg:w-40" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
            {PAYMENT_FILTERS.map((p) => (
              <option key={p} value={p}>
                {p === 'All' ? 'All payments' : p}
              </option>
            ))}
          </select>
          {hasFilters && (
            <button onClick={clearFilters} className="btn-ghost shrink-0">
              <X size={14} /> Clear
            </button>
          )}
        </div>

        {hasFilters && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-black/5">
            <p className="text-sm text-muted">
              {filtered.length} result{filtered.length === 1 ? '' : 's'}
            </p>
            <p className="text-sm font-semibold text-plum">
              Total: {formatCurrency(filteredTotal, settings.currencySymbol)}
            </p>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={bills.length === 0 ? 'No bills yet' : 'No bills match your filters'}
          subtitle={bills.length === 0 ? 'Generate a bill from the New Bill page to see it here.' : 'Try adjusting your search or date range.'}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-black/[0.02] text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Bill No.</th>
                  <th className="text-left px-5 py-3 font-semibold">Client</th>
                  <th className="text-left px-5 py-3 font-semibold">Date</th>
                  <th className="text-left px-5 py-3 font-semibold">Staff</th>
                  <th className="text-left px-5 py-3 font-semibold">Payment</th>
                  <th className="text-right px-5 py-3 font-semibold">Amount</th>
                  <th className="text-right px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-black/[0.015]">
                    <td className="px-5 py-3.5 font-mono text-xs text-plum">{b.billNo}</td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-ink">{b.client?.name || 'Walk-in'}</p>
                      {b.client?.phone && <p className="text-xs text-muted">{b.client.phone}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-muted whitespace-nowrap">{formatDateTime(b.date)}</td>
                    <td className="px-5 py-3.5 text-muted">{getBillStaffNames(b).join(', ') || '—'}</td>
                    <td className="px-5 py-3.5">
                      <Badge tone="brass">{b.paymentMethod}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular text-ink">
                      {formatCurrency(b.total, settings.currencySymbol)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewBill(b)} className="p-1.5 text-muted hover:text-plum" title="View">
                          <Eye size={15} />
                        </button>
                        <button onClick={() => setEditBill(b)} className="p-1.5 text-muted hover:text-plum" title="Edit">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => downloadBillPDF(b, settings)} className="p-1.5 text-muted hover:text-plum" title="Download PDF">
                          <Download size={15} />
                        </button>
                        {b.client?.phone && (
                          <a
                            href={whatsappLink(b.client.phone, whatsappInvoiceMessage(settings, b))}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-muted hover:text-success"
                            title="Share on WhatsApp"
                          >
                            <Share2 size={15} />
                          </a>
                        )}
                        <button onClick={() => setConfirmDelete(b)} className="p-1.5 text-muted hover:text-danger" title="Delete">
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

      {/* View bill modal */}
      <Modal open={!!viewBill} onClose={() => setViewBill(null)} title="Invoice" size="lg">
        {viewBill && (
          <div>
            <div className="border border-black/10 rounded-xl overflow-hidden mb-5">
              <BillPreview bill={viewBill} settings={settings} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => window.print()} className="btn-ghost">
                <Printer size={15} /> Print
              </button>
              <button onClick={() => downloadBillPDF(viewBill, settings)} className="btn-ghost">
                <Download size={15} /> Download PDF
              </button>
              <button
                onClick={() => {
                  setEditBill(viewBill)
                  setViewBill(null)
                }}
                className="btn-ghost"
              >
                <Pencil size={15} /> Edit bill
              </button>
              {viewBill.client?.phone && (
                <a
                  href={whatsappLink(viewBill.client.phone, whatsappInvoiceMessage(settings, viewBill))}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-brass"
                >
                  <Share2 size={15} /> Share on WhatsApp
                </a>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Edit bill modal */}
      {editBill && <EditBillModal bill={editBill} open={!!editBill} onClose={() => setEditBill(null)} />}

      {/* Delete confirm */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete bill?" size="sm">
        {confirmDelete && (
          <div>
            <p className="text-sm text-muted mb-5">
              This will permanently remove <span className="font-semibold text-ink">{confirmDelete.billNo}</span> from your
              billing history. This can't be undone.
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost">
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteBill(confirmDelete.id)
                  setConfirmDelete(null)
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
