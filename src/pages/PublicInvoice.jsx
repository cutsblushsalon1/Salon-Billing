import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Scissors, AlertCircle, Download } from 'lucide-react'
import { InvoiceLayout } from '../components/BillPreview.jsx'
import { fetchInvoiceByBillNo } from '../utils/invoiceSync.js'
import { downloadBillPDF } from '../utils/pdf.js'

// Route: /invoice/:billNo  (e.g. /invoice/INV-0001)
// This page is intentionally outside the <ProtectedRoute> in App.jsx - a
// client should be able to open it straight from WhatsApp without logging in.
export default function PublicInvoice() {
  const { billNo } = useParams()
  const [state, setState] = useState({ loading: true, error: null, bill: null, settings: null })

  useEffect(() => {
    let cancelled = false
    setState({ loading: true, error: null, bill: null, settings: null })

    fetchInvoiceByBillNo(billNo)
      .then(({ bill, settings }) => {
        if (!cancelled) setState({ loading: false, error: null, bill, settings })
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, error: 'not-found', bill: null, settings: null })
      })

    return () => {
      cancelled = true
    }
  }, [billNo])

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <p className="text-muted text-sm">Loading invoice…</p>
      </div>
    )
  }

  if (state.error || !state.bill) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cream gap-3 px-4 text-center">
        <AlertCircle className="text-muted" size={28} />
        <p className="text-ink font-medium">We couldn't find this invoice.</p>
        <p className="text-muted text-sm max-w-xs">
          The link may be incorrect, or this invoice hasn't finished syncing yet. Please check with the salon.
        </p>
      </div>
    )
  }

  const { bill, settings } = state

  return (
    <div className="min-h-screen bg-cream py-8 px-4 sm:px-6">
      <div className="max-w-xl mx-auto">

        <div className="bg-white border border-black/10 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5">
            <InvoiceLayout bill={bill} settings={settings} />
          </div>
        </div>

        <div className="flex justify-center mt-5">
          <button onClick={() => downloadBillPDF(bill, settings)} className="btn-ghost">
            <Download size={15} /> Download PDF
          </button>
        </div>
      </div>
    </div>
  )
}
