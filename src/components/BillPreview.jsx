import React from 'react'
import { createPortal } from 'react-dom'
import { Scissors } from 'lucide-react'
import { formatCurrency, formatDate, calcLineTotal } from '../utils/helpers.js'

function InvoiceLayout({ bill, settings }) {
  return (
    <div className="bg-white text-ink font-body invoice-sheet">
      <div className="flex items-start justify-between mb-6 pb-5 border-b border-ink/10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-plum/10 flex items-center justify-center shrink-0">
            <Scissors size={20} className="text-plum" />
          </div>
          <div>
            <p className="font-display text-xl text-ink leading-tight">{settings.salonName}</p>
            <p className="text-xs text-muted">{settings.tagline}</p>
            <p className="text-[11px] text-muted mt-1 max-w-[220px]">{settings.address}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] uppercase tracking-wide text-muted mb-0.5">Invoice</p>
          <p className="font-display text-lg text-plum leading-tight">{bill.billNo}</p>
          <p className="text-xs text-muted mt-1">{formatDate(bill.date)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
        <div>
          <p className="text-muted mb-1 uppercase tracking-wide text-[10px]">Billed to</p>
          <p className="font-semibold text-ink text-sm">{bill.client?.name || 'Walk-in Customer'}</p>
          {bill.client?.phone && <p className="text-muted mt-0.5">{bill.client.phone}</p>}
        </div>
        <div className="text-right">
          <p className="text-muted mb-1 uppercase tracking-wide text-[10px]">Details</p>
          <p className="text-ink">{settings.phone}</p>
          <p className="text-muted mt-0.5">Paid via {bill.paymentMethod}</p>
          {bill.staff?.name && <p className="text-muted mt-0.5">Served by {bill.staff.name}</p>}
        </div>
      </div>

      <table className="w-full text-sm mb-6 border-collapse">
        <thead>
          <tr className="border-b-2 border-ink/10 text-left text-[10px] uppercase tracking-wide text-muted">
            <th className="py-2 font-semibold">Item</th>
            <th className="py-2 font-semibold text-center w-14">Qty</th>
            <th className="py-2 font-semibold text-right w-24">Price</th>
            <th className="py-2 font-semibold text-right w-28">Amount</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((it, idx) => {
            const line = calcLineTotal(it)
            return (
              <tr key={idx} className="border-b border-ink/5 align-top">
                <td className="py-2.5 pr-2">
                  <span>{it.name}</span>
                  {it.type === 'product' && <span className="text-muted text-[10px] ml-1.5">(product)</span>}
                  {line.discount > 0 && (
                    <span className="block text-[10px] text-brass-dark mt-0.5">{it.discountPercent}% off applied</span>
                  )}
                </td>
                <td className="py-2.5 text-center tabular">{it.qty}</td>
                <td className="py-2.5 text-right tabular">{formatCurrency(it.price, settings.currencySymbol)}</td>
                <td className="py-2.5 text-right tabular font-medium">
                  {line.discount > 0 && (
                    <span className="block text-[10px] text-muted line-through font-normal">
                      {formatCurrency(line.gross, settings.currencySymbol)}
                    </span>
                  )}
                  {formatCurrency(line.net, settings.currencySymbol)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="flex justify-end mb-6">
        <div className="w-full max-w-[220px] space-y-1.5 text-sm">
          <div className="flex justify-between text-muted">
            <span>Subtotal</span>
            <span className="tabular">{formatCurrency(bill.grossSubtotal ?? bill.subtotal, settings.currencySymbol)}</span>
          </div>
          {bill.itemDiscountTotal > 0 && (
            <div className="flex justify-between text-muted">
              <span>Item discounts</span>
              <span className="tabular">-{formatCurrency(bill.itemDiscountTotal, settings.currencySymbol)}</span>
            </div>
          )}
          {bill.discountAmount > 0 && (
            <div className="flex justify-between text-muted">
              <span>Discount</span>
              <span className="tabular">-{formatCurrency(bill.discountAmount, settings.currencySymbol)}</span>
            </div>
          )}
          {bill.taxAmount > 0 && (
            <div className="flex justify-between text-muted">
              <span>Tax ({bill.taxPercent}%)</span>
              <span className="tabular">{formatCurrency(bill.taxAmount, settings.currencySymbol)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-ink/10 font-display text-lg text-plum">
            <span>Total</span>
            <span className="tabular">{formatCurrency(bill.total, settings.currencySymbol)}</span>
          </div>
        </div>
      </div>

      {settings.invoiceFooter && (
        <p className="text-[11px] text-muted text-center border-t border-ink/5 pt-4">{settings.invoiceFooter}</p>
      )}
    </div>
  )
}

export default function BillPreview({ bill, settings }) {
  const printRoot = typeof document !== 'undefined' ? document.getElementById('print-root') : null

  return (
    <>
      {/* On-screen preview, shown inside the modal */}
      <div className="p-3 sm:p-5">
        <InvoiceLayout bill={bill} settings={settings} />
      </div>

      {/* Print-only copy, rendered directly under <body> so it's never clipped by
          the modal's scroll/height constraints when the browser prints. */}
      {printRoot &&
        createPortal(
          <div className="p-8">
            <InvoiceLayout bill={bill} settings={settings} />
          </div>,
          printRoot,
        )}
    </>
  )
}
