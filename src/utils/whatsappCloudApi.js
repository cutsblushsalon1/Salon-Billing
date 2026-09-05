// Client for the connected "WhatsApp CRM" backend - the same project's
// public API used by Invoice WhatsApp sending (Settings > Invoice
// WhatsApp sending), Membership WhatsApp sending (Settings > Membership
// WhatsApp sending), and Follow-ups automatic sending (Settings >
// Follow-up reminders). One connection (Base URL + API key), shared by
// all three features, each with its own on/off switch and its own
// fixed, Meta-approved template.
//
// This app is a static frontend, so it can't hold a Meta permanent
// access token securely or call graph.facebook.com directly (Meta's
// Graph API doesn't send CORS headers for browser callers). Instead it
// points at a small backend that already speaks the WhatsApp Cloud API
// on your behalf - the paired "WhatsApp CRM" project is built for
// exactly this, exposing a public endpoint (under src/app/api/v1/ in
// that project):
//   - POST /api/v1/messages (scope: messages:send) - send a template
//     message.
// An API key with the `messages:send` scope covers all three features.

import { formatPhoneE164, buildInvoiceTemplateParams, buildMembershipTemplateParams, buildFollowUpApiTemplateParams } from './helpers.js'

export function isCrmConnectionConfigured(settings) {
  return !!(settings.whatsappCrmBaseUrl && settings.whatsappCrmApiKey)
}

export function isInvoiceApiConfigured(settings) {
  return !!(settings.invoiceApiEnabled && isCrmConnectionConfigured(settings) && settings.invoiceTemplateName)
}

export function isMembershipApiConfigured(settings) {
  return !!(settings.membershipApiEnabled && isCrmConnectionConfigured(settings) && settings.membershipTemplateName)
}

export function isFollowUpApiConfigured(settings) {
  return !!(
    settings.followUpSendMode === 'api' &&
    isCrmConnectionConfigured(settings) &&
    settings.followUpTemplateName
  )
}

function baseUrlOf(settings) {
  return (settings.whatsappCrmBaseUrl || '').replace(/\/+$/, '')
}

function authHeaders(settings) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${settings.whatsappCrmApiKey}`,
  }
}

// Core template sender - takes already-resolved values, no bill/client
// shape assumptions, so both invoice sending and follow-up sending can
// share it. Returns { ok: true } or { ok: false, error }. Never throws.
export async function sendTemplateViaCloudApi(settings, { to, contactName, templateName, templateLanguage, body, buttonParams }) {
  if (!isCrmConnectionConfigured(settings)) {
    return { ok: false, error: 'WhatsApp CRM connection is not configured in Settings.' }
  }
  if (!to) {
    return { ok: false, error: 'This client has no phone number on file.' }
  }
  if (!templateName) {
    return { ok: false, error: 'No template name set.' }
  }

  let response
  try {
    response = await fetch(`${baseUrlOf(settings)}/api/v1/messages`, {
      method: 'POST',
      headers: authHeaders(settings),
      body: JSON.stringify({
        to,
        type: 'template',
        name: contactName || undefined,
        template: {
          name: templateName,
          language: templateLanguage || 'en',
          params: { body, buttonParams },
        },
      }),
    })
  } catch {
    return { ok: false, error: "Couldn't reach the WhatsApp CRM. Check the Base URL and your connection." }
  }

  if (!response.ok) {
    let message = `Send failed (HTTP ${response.status}).`
    try {
      const data = await response.json()
      if (data?.error?.message) message = data.error.message
    } catch {
      // Non-JSON error body - keep the generic message above.
    }
    return { ok: false, error: message }
  }

  return { ok: true }
}

// Invoice-specific wrapper: builds the template params straight from
// the bill (see buildInvoiceTemplateParams in utils/helpers.js).
export async function sendInvoiceViaCloudApi(settings, bill) {
  if (!isInvoiceApiConfigured(settings)) {
    return { ok: false, error: 'Invoice WhatsApp sending is not fully configured in Settings.' }
  }
  const { body, buttonParams } = buildInvoiceTemplateParams(settings, bill)
  return sendTemplateViaCloudApi(settings, {
    to: formatPhoneE164(bill.client?.phone),
    contactName: bill.client?.name,
    templateName: settings.invoiceTemplateName,
    templateLanguage: settings.invoiceTemplateLanguage,
    body,
    buttonParams,
  })
}

// Membership-specific wrapper: builds the template params straight from
// the membership + plan (see buildMembershipTemplateParams in
// utils/helpers.js) - mirrors sendInvoiceViaCloudApi exactly.
export async function sendMembershipViaCloudApi(settings, membership, plan) {
  if (!isMembershipApiConfigured(settings)) {
    return { ok: false, error: 'Membership WhatsApp sending is not fully configured in Settings.' }
  }
  const { body } = buildMembershipTemplateParams(settings, membership, plan)
  return sendTemplateViaCloudApi(settings, {
    to: formatPhoneE164(membership.clientPhone),
    contactName: membership.clientName,
    templateName: settings.membershipTemplateName,
    templateLanguage: settings.membershipTemplateLanguage,
    body,
    buttonParams: {},
  })
}

// Follow-up-specific wrapper: builds the template params straight from
// the client (see buildFollowUpApiTemplateParams in utils/helpers.js).
// Always sends the one fixed, Meta-approved follow-up template
// configured in Settings — no per-template variable mapping, no
// "sync templates" step, same pattern as invoice/membership sending.
export async function sendFollowUpViaCloudApi(settings, client) {
  if (!isFollowUpApiConfigured(settings)) {
    return { ok: false, error: 'Follow-up automatic sending is not fully configured in Settings.' }
  }
  const { body } = buildFollowUpApiTemplateParams(client, settings)
  return sendTemplateViaCloudApi(settings, {
    to: formatPhoneE164(client.phone),
    contactName: client.name,
    templateName: settings.followUpTemplateName,
    templateLanguage: settings.followUpTemplateLanguage,
    body,
    buttonParams: {},
  })
}
