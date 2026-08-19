import React, { useMemo, useState } from 'react'
import { Search, Plus, Minus, Trash2, Scissors, Package, Save, TriangleAlert } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { Modal } from './ui.jsx'
import { calcBillTotals, calcLineTotal, formatCurrency, matchesCatalogQuery } from '../utils/helpers.js'

const PAYMENT_METHODS = ['Cash', 'Card', 'UPI', 'Wallet']

function toDateInputValue(iso) {
  const d = new Date(iso)
  return d.toISOString().slice(0, 10)
}

export default function EditBillModal({ bill, open, onClose }) {
  const { services, products, staff, settings, updateBill, upsertClient } = useApp()

  const [items, setItems] = useState(() =>
    bill.items.map((it) => ({ ...it, discountPercent: it.discountPercent || 0, staffId: it.staffId || '', staffName: it.staffName || '' })),
  )
  const [discountType, setDiscountType] = useState(bill.discountType || 'none')
  const [discountValue, setDiscountValue] = useState(bill.discountValue || '')
  const [taxPercent, setTaxPercent] = useState(bill.taxPercent || 0)
  const [paymentMethod, setPaymentMethod] = useState(bill.paymentMethod || 'Cash')
  const [dateStr, setDateStr] = useState(() => toDateInputValue(bill.date))
  const [clientName, setClientName] = useState(bill.client?.name || '')
  const [clientPhone, setClientPhone] = useState(bill.client?.phone || '')
  const [catalogTab, setCatalogTab] = useState('service')
  const [catalogQuery, setCatalogQuery] = useState('')

  const catalogList = catalogTab === 'service' ? services : products
  const filteredCatalog = useMemo(() => {
    return catalogList.filter((item) => matchesCatalogQuery(item, catalogQuery)).slice(0, 20)
  }, [catalogList, catalogQuery])

  function addItem(item, type) {
    setItems((prev) => {
      const existing = prev.find((c) => c.refId === item.id && c.type === type)
      if (existing) return prev.map((c) => (c.refId === item.id && c.type === type ? { ...c, qty: c.qty + 1 } : c))
      return [...prev, { refId: item.id, type, name: item.name, price: item.price, qty: 1, discountPercent: 0, staffId: '', staffName: '' }]
    })
  }

  function updateQty(refId, type, delta) {
    setItems((prev) =>
      prev.map((c) => (c.refId === refId && c.type === type ? { ...c, qty: Math.max(1, c.qty + delta) } : c)),
    )
  }

  function updateDiscount(refId, type, value) {
    const clamped = Math.max(0, Math.min(100, Number(value) || 0))
    setItems((prev) => prev.map((c) => (c.refId === refId && c.type === type ? { ...c, discountPercent: clamped } : c)))
  }

  function updateStaff(refId, type, staffId) {
    const member = staff.find((s) => s.id === staffId)
    setItems((prev) =>
      prev.map((c) => (c.refId === refId && c.type === type ? { ...c, staffId, staffName: member?.name || '' } : c)),
    )
  }

  function removeItem(refId, type) {
    setItems((prev) => prev.filter((c) => !(c.refId === refId && c.type === type)))
  }

  const totals = useMemo(
    () => calcBillTotals({ items, discountType, discountValue, taxPercent }),
    [items, discountType, discountValue, taxPercent],
  )

  const canSave = items.length > 0 && items.every((it) => !!it.staffId) && clientName.trim().length > 0

  function handleSave() {
    if (!canSave) return
    // Keep the original time-of-day, only change the calendar date if edited
    const original = new Date(bill.date)
    const [y, m, d] = dateStr.split('-').map(Number)
    original.setFullYear(y, m - 1, d)

    const trimmedName = clientName.trim()
    const trimmedPhone = clientPhone.trim()
    const updatedClient = bill.client?.id
      ? { ...bill.client, name: trimmedName, phone: trimmedPhone }
      : { name: trimmedName || 'Walk-in Customer', ...(trimmedPhone ? { phone: trimmedPhone } : {}) }

    updateBill(bill, {
      items,
      discountType,
      discountValue: Number(discountValue) || 0,
      taxPercent: Number(taxPercent) || 0,
      paymentMethod,
      date: original.toISOString(),
      client: updatedClient,
      ...totals,
    })

    // If this bill belongs to a saved client (not a one-off walk-in), keep
    // their master record in sync too - otherwise the correction would only
    // live on this one invoice while Clients, Reports, and Follow-ups still
    // showed the old name/phone.
    if (bill.client?.id) {
      upsertClient({ id: bill.client.id, name: trimmedName, phone: trimmedPhone })
    }

    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={`Edit ${bill.billNo}`} size="xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <label className="label">Client name</label>
              <input
                className={`input ${!clientName.trim() ? 'border-danger/40' : ''}`}
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Walk-in Customer"
              />
            </div>
            <div>
              <label className="label">Phone number</label>
              <input
                className="input"
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="10-digit mobile"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <label className="label">Bill date</label>
              <input type="date" className="input" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
            </div>
            <div>
              <label className="label">Payment method</label>
              <div className="flex items-center gap-1.5">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      paymentMethod === m ? 'bg-plum text-cream border-plum' : 'border-black/10 text-muted hover:bg-black/5'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Items */}
          <div>
            <p className="label mb-2">Items</p>
            {items.length === 0 && <p className="text-sm text-muted py-3">No items — add at least one below.</p>}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {items.map((it) => {
                const line = calcLineTotal(it)
                return (
                  <div key={`${it.type}-${it.refId}`} className="p-3 rounded-lg border border-black/10">
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink truncate">{it.name}</p>
                        <p className="text-xs text-muted">{formatCurrency(it.price, settings.currencySymbol)} each</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => updateQty(it.refId, it.type, -1)} className="w-6 h-6 rounded-full border border-black/10 flex items-center justify-center hover:bg-black/5">
                          <Minus size={11} />
                        </button>
                        <span className="text-sm tabular w-4 text-center">{it.qty}</span>
                        <button onClick={() => updateQty(it.refId, it.type, 1)} className="w-6 h-6 rounded-full border border-black/10 flex items-center justify-center hover:bg-black/5">
                          <Plus size={11} />
                        </button>
                        <button onClick={() => removeItem(it.refId, it.type)} className="text-muted hover:text-danger ml-1">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <select
                        value={it.staffId}
                        onChange={(e) => updateStaff(it.refId, it.type, e.target.value)}
                        className={`rounded-md border px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brass/60 focus:border-brass ${
                          it.staffId ? 'border-black/10' : 'border-danger/40 text-danger'
                        }`}
                      >
                        <option value="">Assign staff…</option>
                        {staff.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} {s.active ? '' : '(inactive)'}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1.5">
                        <label className="text-[11px] text-muted whitespace-nowrap">Discount</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={it.discountPercent || ''}
                          onChange={(e) => updateDiscount(it.refId, it.type, e.target.value)}
                          placeholder="0"
                          className="w-full rounded-md border border-black/10 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brass/60 focus:border-brass"
                        />
                        <span className="text-[11px] text-muted">%</span>
                      </div>
                    </div>
                    <p className="text-xs tabular text-right mt-1.5">
                      {line.discount > 0 && (
                        <span className="text-muted line-through mr-1.5">{formatCurrency(line.gross, settings.currencySymbol)}</span>
                      )}
                      <span className="font-semibold text-ink">{formatCurrency(line.net, settings.currencySymbol)}</span>
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Add item */}
          <div>
            <p className="label mb-2">Add item</p>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setCatalogTab('service')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                  catalogTab === 'service' ? 'bg-plum text-cream' : 'bg-black/5 text-muted hover:bg-black/10'
                }`}
              >
                <Scissors size={12} /> Services
              </button>
              <button
                onClick={() => setCatalogTab('product')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                  catalogTab === 'product' ? 'bg-plum text-cream' : 'bg-black/5 text-muted hover:bg-black/10'
                }`}
              >
                <Package size={12} /> Products
              </button>
            </div>
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                className="input pl-9 py-2 text-sm"
                placeholder={`Search ${catalogTab === 'service' ? 'services' : 'products'} by name or category…`}
                value={catalogQuery}
                onChange={(e) => setCatalogQuery(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
              {filteredCatalog.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addItem(item, catalogTab)}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg border border-black/10 hover:border-brass hover:bg-brass/5 text-left text-xs"
                >
                  <span className="truncate">{item.name}</span>
                  <Plus size={13} className="text-plum shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <select className="input" value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
              <option value="none">No discount</option>
              <option value="percent">Discount %</option>
              <option value="flat">Discount flat</option>
            </select>
            <input
              className="input"
              type="number"
              min="0"
              placeholder="0"
              disabled={discountType === 'none'}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Tax %</label>
            <input className="input" type="number" min="0" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} />
          </div>

          <div className="space-y-1.5 pt-3 border-t border-black/5 text-sm">
            <div className="flex justify-between text-muted">
              <span>Subtotal</span>
              <span className="tabular">{formatCurrency(totals.grossSubtotal, settings.currencySymbol)}</span>
            </div>
            {totals.itemDiscountTotal > 0 && (
              <div className="flex justify-between text-muted">
                <span>Item discounts</span>
                <span className="tabular">-{formatCurrency(totals.itemDiscountTotal, settings.currencySymbol)}</span>
              </div>
            )}
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-muted">
                <span>Discount</span>
                <span className="tabular">-{formatCurrency(totals.discountAmount, settings.currencySymbol)}</span>
              </div>
            )}
            {totals.taxAmount > 0 && (
              <div className="flex justify-between text-muted">
                <span>Tax</span>
                <span className="tabular">{formatCurrency(totals.taxAmount, settings.currencySymbol)}</span>
              </div>
            )}
            <div className="flex justify-between font-display text-lg text-plum pt-2">
              <span>Total</span>
              <span className="tabular">{formatCurrency(totals.total, settings.currencySymbol)}</span>
            </div>
          </div>

          {bill.client?.id && totals.total !== bill.total && (
            <p className="text-xs text-muted flex items-start gap-1.5">
              <TriangleAlert size={13} className="text-brass-dark mt-0.5 shrink-0" />
              {bill.client.name}'s total spent will adjust by{' '}
              {totals.total > bill.total ? '+' : ''}
              {formatCurrency(totals.total - bill.total, settings.currencySymbol)}.
            </p>
          )}

          <button onClick={handleSave} disabled={!canSave} className="btn-primary w-full py-2.5">
            <Save size={15} /> Save changes
          </button>
          {!canSave && (
            <p className="text-xs text-danger text-center">
              {!clientName.trim() ? 'Client name is required.' : 'Every item needs a staff member assigned.'}
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}
