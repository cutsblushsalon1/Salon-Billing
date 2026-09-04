import React, { useState } from 'react'
import { Share2, Loader2, CircleCheck, CircleX } from 'lucide-react'
import { whatsappInvoiceMessage, whatsappLink } from '../utils/helpers.js'
import { isInvoiceApiConfigured, sendInvoiceViaCloudApi } from '../utils/whatsappCloudApi.js'

// Drop-in replacement for the old static "Share on WhatsApp" wa.me
// anchor used in NewBill and BillingHistory. Behaviour depends on
// Settings > Invoice WhatsApp sending:
//   - Not enabled/configured (default): unchanged manual behaviour -
//     an <a href="wa.me/...">  link that opens a pre-filled chat.
//   - Enabled & configured: a real <button> that sends the approved
//     invoice template straight through the connected WhatsApp Cloud
//     API backend, with inline sending/sent/error feedback.
//
// variant="icon" renders the small icon-only control used in the
// BillingHistory table row; variant="button" (default) renders the
// full labelled button used in the success/view modals.
export default function InvoiceWhatsAppButton({ bill, settings, variant = 'button', className = '' }) {
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [error, setError] = useState('')

  if (!bill.client?.phone) return null

  const apiMode = isInvoiceApiConfigured(settings)

  async function handleApiSend() {
    setStatus('sending')
    setError('')
    const result = await sendInvoiceViaCloudApi(settings, bill)
    if (result.ok) {
      setStatus('sent')
      setTimeout(() => setStatus('idle'), 3000)
    } else {
      setStatus('error')
      setError(result.error)
    }
  }

  // Manual default - unchanged from before.
  if (!apiMode) {
    const href = whatsappLink(bill.client.phone, whatsappInvoiceMessage(settings, bill))
    if (variant === 'icon') {
      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className={className || 'p-1.5 text-muted hover:text-success'}
          title="Share on WhatsApp"
        >
          <Share2 size={15} />
        </a>
      )
    }
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className || 'btn-brass'}>
        <Share2 size={15} /> Share on WhatsApp
      </a>
    )
  }

  // API mode - sends the approved template directly, no chat window needed.
  const icon =
    status === 'sending' ? (
      <Loader2 size={15} className="animate-spin" />
    ) : status === 'sent' ? (
      <CircleCheck size={15} />
    ) : status === 'error' ? (
      <CircleX size={15} />
    ) : (
      <Share2 size={15} />
    )

  if (variant === 'icon') {
    return (
      <button
        onClick={handleApiSend}
        disabled={status === 'sending'}
        className={
          className ||
          `p-1.5 ${status === 'error' ? 'text-danger' : status === 'sent' ? 'text-success' : 'text-muted hover:text-success'}`
        }
        title={status === 'error' ? error || 'Send failed - click to retry' : 'Send invoice via WhatsApp'}
      >
        {icon}
      </button>
    )
  }

  const label = status === 'sending' ? 'Sending…' : status === 'sent' ? 'Sent' : status === 'error' ? 'Retry send' : 'Send Invoice'

  return (
    <div className="flex flex-col items-start gap-1">
      <button onClick={handleApiSend} disabled={status === 'sending'} className={className || 'btn-brass'}>
        {icon} {label}
      </button>
      {status === 'error' && error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
