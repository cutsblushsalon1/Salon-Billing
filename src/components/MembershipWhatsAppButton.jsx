import React, { useState } from 'react'
import { Share2, Loader2, CircleCheck, CircleX } from 'lucide-react'
import { whatsappMembershipMessage, whatsappLink } from '../utils/helpers.js'
import { isMembershipApiConfigured, sendMembershipViaCloudApi } from '../utils/whatsappCloudApi.js'

// Drop-in replacement for the old static "Share on WhatsApp" wa.me anchor
// on the membership enrollment success modal - same pattern as
// InvoiceWhatsAppButton. Behaviour depends on Settings > Membership
// WhatsApp sending:
//   - Not enabled/configured (default): unchanged manual behaviour - an
//     <a href="wa.me/...">  link that opens a pre-filled chat.
//   - Enabled & configured: a real <button> that sends the approved
//     membership-activated template straight through the connected
//     WhatsApp Cloud API backend, with inline sending/sent/error feedback.
export default function MembershipWhatsAppButton({ membership, plan, settings, className = '' }) {
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [error, setError] = useState('')

  if (!membership.clientPhone) return null

  const apiMode = isMembershipApiConfigured(settings)

  async function handleApiSend() {
    setStatus('sending')
    setError('')
    const result = await sendMembershipViaCloudApi(settings, membership, plan)
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
    const href = whatsappLink(membership.clientPhone, whatsappMembershipMessage(settings, membership, plan))
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

  const label = status === 'sending' ? 'Sending…' : status === 'sent' ? 'Sent' : status === 'error' ? 'Retry send' : 'Send Activation Message'

  return (
    <div className="flex flex-col items-start gap-1">
      <button onClick={handleApiSend} disabled={status === 'sending'} className={className || 'btn-brass'}>
        {icon} {label}
      </button>
      {status === 'error' && error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
