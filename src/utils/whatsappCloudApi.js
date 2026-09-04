// Sends the invoice WhatsApp template through a connected WhatsApp
// Cloud API backend, instead of opening a manual wa.me link.
//
// This app is a static frontend, so it can't hold a Meta permanent
// access token securely or call graph.facebook.com directly (Meta's
// Graph API doesn't send CORS headers for browser callers). Settings >
// Invoice WhatsApp sending instead points at a small backend that
// already speaks the WhatsApp Cloud API on your behalf - the paired
// "WhatsApp CRM" project is built for exactly this, exposing a public
// `POST /api/v1/messages` endpoint (see its src/app/api/v1/messages/
// route.ts) authenticated by an API key with the `messages:send` scope.
//
// Payload shape matches that endpoint's contract:
//   { to, type: 'template', template: { name, language, params } }
// `params` here is the structured object form (`{ body, buttonParams }`),
// which the CRM forwards straight into Meta's per-send template
// components - see buildInvoiceTemplateParams() in utils/helpers.js for
// how those values are generated from the bill.
//
// Swap the URL/auth below if you point Invoice WhatsApp sending at a
// different Cloud API backend - the important part is that it accepts
// this same { to, type, template } JSON shape.

import { formatPhoneE164, buildInvoiceTemplateParams } from './helpers.js'

export function isInvoiceApiConfigured(settings) {
  return !!(settings.invoiceApiEnabled && settings.invoiceApiBaseUrl && settings.invoiceApiKey && settings.invoiceTemplateName)
}

// Returns { ok: true } on success, or { ok: false, error } with a
// short, user-facing message on failure. Never throws.
export async function sendInvoiceViaCloudApi(settings, bill) {
  if (!isInvoiceApiConfigured(settings)) {
    return { ok: false, error: 'WhatsApp Cloud API is not fully configured in Settings.' }
  }

  const to = formatPhoneE164(bill.client?.phone)
  if (!to) {
    return { ok: false, error: 'This client has no phone number on file.' }
  }

  const { body, buttonParams } = buildInvoiceTemplateParams(settings, bill)
  const baseUrl = settings.invoiceApiBaseUrl.replace(/\/+$/, '')

  let response
  try {
    response = await fetch(`${baseUrl}/api/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.invoiceApiKey}`,
      },
      body: JSON.stringify({
        to,
        type: 'template',
        name: bill.client?.name || undefined,
        template: {
          name: settings.invoiceTemplateName,
          language: settings.invoiceTemplateLanguage || 'en',
          params: { body, buttonParams },
        },
      }),
    })
  } catch {
    return { ok: false, error: "Couldn't reach the WhatsApp API backend. Check the Base URL and your connection." }
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
