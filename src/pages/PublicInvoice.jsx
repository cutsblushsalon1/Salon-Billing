import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Scissors, AlertCircle, Download, Star } from 'lucide-react'
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

        {/* Customer actions */}
        <div className="mt-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {settings.googleReviewLink && (
              <a
                href={settings.googleReviewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  w-full sm:w-[210px]
                  h-11
                  inline-flex items-center justify-center gap-2
                  rounded-lg
                  bg-ink text-white
                  px-4
                  text-sm font-medium
                  transition-opacity hover:opacity-90
                "
              >
                <Star size={14} fill="currentColor" />
                Leave a Google Review
              </a>
            )}

            <button
              onClick={() => downloadBillPDF(bill, settings)}
              className="
                w-full sm:w-[210px]
                h-11
                inline-flex items-center justify-center gap-2
                rounded-lg
                border border-black/10
                bg-white
                text-ink
                px-4
                text-sm font-medium
                transition-colors hover:bg-black/[0.03]
              "
            >
              <Download size={15} />
              Download Invoice PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
