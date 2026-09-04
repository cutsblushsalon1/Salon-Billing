export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

// Shared catalog search predicate for services/products: matches on name OR
// category, so typing a category ("Hair", "Skin"…) surfaces every item in
// it, not just an item literally named that. Used anywhere a catalog list
// gets filtered by a search box (New Bill, Edit Bill, membership free-service
// picker) so search behaves the same everywhere.
export function matchesCatalogQuery(item, query) {
  const q = (query || '').trim().toLowerCase()
  if (!q) return true
  return item.name.toLowerCase().includes(q) || (item.category || '').toLowerCase().includes(q)
}

export function formatCurrency(amount, symbol = '\u20B9') {
  const n = Number(amount) || 0
  return `${symbol}${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

export function formatDate(dateStr, opts = {}) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...opts,
  })
}

export function formatDateTime(dateStr) {
  const d = new Date(dateStr)
  return `${formatDate(dateStr)}, ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
}

export function isSameDay(a, b) {
  const da = new Date(a)
  const db = new Date(b)
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
}

export function isSameMonth(a, b) {
  const da = new Date(a)
  const db = new Date(b)
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth()
}

export function isInRange(dateStr, start, end) {
  const d = new Date(dateStr).setHours(0, 0, 0, 0)
  const s = start ? new Date(start).setHours(0, 0, 0, 0) : -Infinity
  const e = end ? new Date(end).setHours(23, 59, 59, 999) : Infinity
  return d >= s && d <= e
}

export function buildInvoiceNumber(prefix, counter) {
  return `${prefix}-${String(counter).padStart(4, '0')}`
}

// Public, no-login URL for a single invoice - opens PublicInvoice.jsx, which
// loads the bill from Supabase by billNo.
export function invoicePublicLink(billNo) {
  return `${window.location.origin}/invoice/${encodeURIComponent(billNo)}`
}

// Short WhatsApp message + dynamic invoice link, instead of dumping the
// whole itemised bill into the chat message. Clean, professional formatting
// with a closing line asking for a Google review.
export function whatsappInvoiceMessage(settings, bill) {
  const name = bill.client?.name || 'there'
  const reviewLink = settings.googleReviewLink

  const lines = [
    `Hello ${name}, thank you for visiting *${settings.salonName}*!`,
    ``,
    `Your invoice *${bill.billNo}* is ready:`,
    invoicePublicLink(bill.billNo),
    ``,
    `Total paid: *${formatCurrency(bill.total, settings.currencySymbol)}*`,
    ``,
    reviewLink ? `We'd love your feedback — please leave us a quick Google review:` : null,
    reviewLink || null,
    reviewLink ? `` : null,
    `See you again soon!`,
    `— Team ${settings.salonName}`,
  ]

  return lines.filter((line) => line !== null && line !== undefined).join('\n')
}

export function whatsappLink(phone, message) {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '')
  const withCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`
}

// Same 10-digit-local -> +91 assumption as whatsappLink, but returns
// E.164 (leading +) instead of a wa.me path segment - what the WhatsApp
// Cloud API / the CRM's public API expects for the "to" field.
export function formatPhoneE164(phone) {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '')
  const withCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone
  return withCountry ? `+${withCountry}` : ''
}

// Renders the invoice date the way the approved WhatsApp template
// expects it, e.g. "3 Sept 2026" - day without a leading zero, unlike
// formatDate() elsewhere in the app which pads it for table columns.
export function formatInvoiceTemplateDate(dateStr) {
  const d = new Date(dateStr)
  const day = d.getDate()
  const month = d.toLocaleDateString('en-IN', { month: 'short' })
  const year = d.getFullYear()
  // en-IN gives "Sep"; the approved template copy uses "Sept".
  const monthLabel = month === 'Sep' ? 'Sept' : month
  return `${day} ${monthLabel} ${year}`
}

// Builds the dynamic values for the approved "invoice created" WhatsApp
// template (see Settings > Invoice WhatsApp sending for the template
// copy) directly from the bill, so every field is generated from real
// invoice data rather than typed in anywhere:
//   {{1}} name, {{2}} invoice number, {{3}} date, {{4}} total paid
// plus the "View Invoice" button's {{1}}, which is the invoice number
// appended to the button's base URL.
export function buildInvoiceTemplateParams(settings, bill) {
  const name = bill.client?.name || 'there'
  const invoiceNo = bill.billNo
  const date = formatInvoiceTemplateDate(bill.date)
  const totalPaid = formatCurrency(bill.total, settings.currencySymbol)
  return {
    body: [name, invoiceNo, date, totalPaid],
    // Button index 0 = the single "View Invoice" URL button.
    buttonParams: { 0: invoiceNo },
  }
}

export function daysSince(dateStr) {
  const start = new Date(dateStr)
  start.setHours(0, 0, 0, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.round((now - start) / 86400000)
}

export function renderTemplate(body, tokens) {
  return body.replace(/\{(\w+)\}/g, (match, key) => {
    const value = tokens[key]
    return value !== undefined && value !== '' ? value : match
  })
}

export function getClientLastService(client) {
  const visits = client.visits || []
  if (visits.length === 0) return ''
  const last = visits[visits.length - 1]
  return (last.items && last.items[0]) || ''
}

// The fixed set of client-context values available to plug into a
// follow-up message - used both by custom {token} templates
// (renderTemplate, below) and, for automatic sending, as the pool of
// values an admin can map onto a synced WhatsApp template's {{n}}
// variables in Settings (see buildFollowUpSyncedTemplateParams).
export const FOLLOWUP_TOKENS = [
  { key: 'clientName', label: "Client's name" },
  { key: 'salonName', label: 'Your salon name' },
  { key: 'lastVisitDate', label: 'Date of their last visit' },
  { key: 'daysSinceVisit', label: 'Days since their last visit' },
  { key: 'lastService', label: 'The last service they had' },
]

export function buildFollowUpTokenValues(client, settings) {
  return {
    clientName: client.name,
    salonName: settings.salonName,
    lastVisitDate: client.lastVisit ? formatDate(client.lastVisit) : '',
    daysSinceVisit: client.lastVisit ? String(daysSince(client.lastVisit)) : '',
    lastService: getClientLastService(client) || 'next service',
  }
}

export function buildFollowUpMessage(template, client, settings) {
  const tokens = buildFollowUpTokenValues(client, settings)
  return renderTemplate(template.body, tokens)
}

// Builds body/button params for a *synced* WhatsApp CRM template (see
// FollowUps automatic sending) using the variable-to-token mapping an
// admin configured for it in Settings. `mapping` is
// `settings.followUpSyncedTemplateMappings[template.id]`, shaped
// `{ body: [tokenKey, ...], buttonParams: { [buttonIndex]: tokenKey } }`.
// A variable with no mapping configured yet resolves to an empty
// string rather than throwing, so an incomplete setup fails loudly on
// WhatsApp's side (an obviously-blank field) instead of crashing here.
export function buildFollowUpSyncedTemplateParams(client, settings, mapping) {
  const tokenValues = buildFollowUpTokenValues(client, settings)
  const resolve = (tokenKey) => (tokenKey ? tokenValues[tokenKey] ?? '' : '')
  const body = (mapping?.body || []).map(resolve)
  const buttonParams = {}
  Object.entries(mapping?.buttonParams || {}).forEach(([index, tokenKey]) => {
    buttonParams[index] = resolve(tokenKey)
  })
  return { body, buttonParams }
}

export function getBillStaffNames(bill) {
  const names = new Set()
  bill.items?.forEach((it) => {
    if (it.staffName) names.add(it.staffName)
  })
  if (names.size === 0 && bill.staff?.name) names.add(bill.staff.name)
  if (names.size === 0 && bill.staffList?.length) bill.staffList.forEach((s) => names.add(s.name))
  return Array.from(names)
}

// Derives a display status for a client membership from its expiry date.
// `daysLeft` is negative once expired, so callers can also use it for
// "expires in N days" style copy.
export function getMembershipStatus(expiryDate) {
  if (!expiryDate) return { label: 'Unknown', tone: 'muted', daysLeft: null }
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const exp = new Date(expiryDate)
  exp.setHours(0, 0, 0, 0)
  const daysLeft = Math.round((exp - now) / 86400000)
  if (daysLeft < 0) return { label: 'Expired', tone: 'danger', daysLeft }
  if (daysLeft <= 15) return { label: 'Expiring soon', tone: 'brass', daysLeft }
  return { label: 'Active', tone: 'success', daysLeft }
}

// Finds a client's most relevant membership: prefers one that isn't expired,
// falling back to the most recently enrolled record if every membership on
// file for this client has lapsed.
export function findActiveMembership(clientId, clientMemberships) {
  if (!clientId) return null
  const memberships = (clientMemberships || []).filter((m) => m.clientId === clientId)
  if (memberships.length === 0) return null
  const withStatus = memberships.map((m) => ({ m, status: getMembershipStatus(m.expiryDate) }))
  const nonExpired = withStatus.filter((x) => x.status.label !== 'Expired')
  const pool = nonExpired.length > 0 ? nonExpired : withStatus
  return pool.sort((a, b) => new Date(b.m.enrolledAt || 0) - new Date(a.m.enrolledAt || 0))[0].m
}

// Checks whether an annual date (birthday/anniversary — year is ignored)
// falls within `windowDays` of `refDate`, checked against its closest
// occurrence in the previous, current, or next year (so it still matches
// near a year boundary, e.g. a Jan 2 birthday checked on Dec 30).
export function isInAnnualWindow(dateStr, refDate = new Date(), windowDays = 3) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return false
  const ref = new Date(refDate)
  ref.setHours(0, 0, 0, 0)
  const occurrences = [ref.getFullYear() - 1, ref.getFullYear(), ref.getFullYear() + 1].map((year) => {
    const occurrence = new Date(year, d.getMonth(), d.getDate())
    occurrence.setHours(0, 0, 0, 0)
    return occurrence
  })
  return occurrences.some((occurrence) => Math.abs((occurrence - ref) / 86400000) <= windowDays)
}

// A membership plan now carries independent discount percentages for
// services and products, plus its own birthday-week and anniversary-week
// bonus discounts (also split by service/product). `discountPercent` is
// kept as a legacy fallback for plans saved before this split existed.
export function getPlanDiscountFields(plan) {
  if (!plan) {
    return {
      service: 0,
      product: 0,
      birthdayService: 0,
      birthdayProduct: 0,
      anniversaryService: 0,
      anniversaryProduct: 0,
    }
  }
  const legacy = Number(plan.discountPercent) || 0
  return {
    service: Number(plan.discountPercentService ?? legacy) || 0,
    product: Number(plan.discountPercentProduct ?? legacy) || 0,
    birthdayService: Number(plan.birthdayDiscountPercentService) || 0,
    birthdayProduct: Number(plan.birthdayDiscountPercentProduct) || 0,
    anniversaryService: Number(plan.anniversaryDiscountPercentService) || 0,
    anniversaryProduct: Number(plan.anniversaryDiscountPercentProduct) || 0,
  }
}

// Combines a membership plan's base service/product discounts with the
// birthday or anniversary bonus (if applicable) for a given client and bill
// date. Returns null when there's no usable (non-expired) membership to
// discount against. The result carries a `service` and `product` breakdown
// so each cart line can be discounted according to its own item type.
export function getMembershipDiscountInfo(client, membership, plan, refDate = new Date()) {
  if (!membership || !plan) return null
  const status = getMembershipStatus(membership.expiryDate)
  if (status.label === 'Expired') return null
  const isBirthdayWeek = isInAnnualWindow(client?.birthday, refDate)
  const isAnniversaryWeek = isInAnnualWindow(client?.anniversary, refDate)
  const fields = getPlanDiscountFields(plan)

  const bonusService = Math.max(
    isBirthdayWeek ? fields.birthdayService : 0,
    isAnniversaryWeek ? fields.anniversaryService : 0,
  )
  const bonusProduct = Math.max(
    isBirthdayWeek ? fields.birthdayProduct : 0,
    isAnniversaryWeek ? fields.anniversaryProduct : 0,
  )

  return {
    isBirthdayWeek,
    isAnniversaryWeek,
    service: {
      planDiscount: fields.service,
      bonusDiscount: bonusService,
      total: Math.min(100, fields.service + bonusService),
    },
    product: {
      planDiscount: fields.product,
      bonusDiscount: bonusProduct,
      total: Math.min(100, fields.product + bonusProduct),
    },
  }
}

// A membership plan can bundle a handful of complimentary services (e.g.
// "2 free haircuts"), available only from services on the plan's free-service
// list, and only within `freeServiceValidityMonths` of the membership's
// start date (falling back to the membership's own validity period if
// that's left blank). Once the count or the window runs out, the plan's
// normal % discount applies instead — the free perk never blocks the
// regular member discount.
//
// Both WHICH services are free and HOW MANY of them can differ by gender
// (ticket values, and how many "free" visits make sense, are usually
// different for men and women), so a plan carries two lists —
// `freeServiceIdsMale` / `freeServiceIdsFemale` — and two counts —
// `freeServiceCountMale` / `freeServiceCountFemale`. `freeServiceIds` /
// `freeServiceCount` are kept as legacy fallbacks for plans saved before the
// male/female split existed, used for either gender (or when the client's
// gender isn't set) if no gender-specific value is present.
export function getPlanFreeServiceIds(plan, gender) {
  if (!plan) return []
  const male = Array.isArray(plan.freeServiceIdsMale) ? plan.freeServiceIdsMale : null
  const female = Array.isArray(plan.freeServiceIdsFemale) ? plan.freeServiceIdsFemale : null
  if (gender === 'Male' && male) return male
  if (gender === 'Female' && female) return female
  if (male || female) return (gender === 'Male' ? male : female) || []
  return Array.isArray(plan.freeServiceIds) ? plan.freeServiceIds : []
}

export function getPlanFreeServiceCount(plan, gender) {
  if (!plan) return 0
  const male = plan.freeServiceCountMale
  const female = plan.freeServiceCountFemale
  const hasMale = male !== undefined && male !== null && male !== ''
  const hasFemale = female !== undefined && female !== null && female !== ''
  if (gender === 'Male' && hasMale) return Number(male) || 0
  if (gender === 'Female' && hasFemale) return Number(female) || 0
  if (hasMale || hasFemale) return Number(gender === 'Male' ? male : female) || 0
  return Number(plan.freeServiceCount) || 0
}

export function getMembershipFreeServiceInfo(membership, plan, refDate = new Date(), gender) {
  if (!membership || !plan) return null
  const serviceIds = getPlanFreeServiceIds(plan, gender)
  const totalFree = getPlanFreeServiceCount(plan, gender)
  if (serviceIds.length === 0 || totalFree === 0) return null

  const windowMonths = Number(plan.freeServiceValidityMonths) || Number(plan.validityMonths) || 0
  const start = membership.startDate ? new Date(membership.startDate) : new Date(membership.enrolledAt || refDate)
  const windowEnd = new Date(start)
  windowEnd.setMonth(windowEnd.getMonth() + windowMonths)

  const withinWindow = windowMonths > 0 ? new Date(refDate) <= windowEnd : true
  const used = Number(membership.freeServicesUsed) || 0
  const remaining = Math.max(0, totalFree - used)

  return {
    serviceIds,
    totalFree,
    used,
    remaining,
    withinWindow,
    windowEnd,
    eligible: withinWindow && remaining > 0,
  }
}

export function whatsappMembershipMessage(settings, membership, plan) {
  const fields = getPlanDiscountFields(plan)
  const bonusBits = []
  if (fields.birthdayService || fields.birthdayProduct) {
    bonusBits.push(
      `an extra ${fields.birthdayService}% off services & ${fields.birthdayProduct}% off products during your birthday week`,
    )
  }
  if (fields.anniversaryService || fields.anniversaryProduct) {
    bonusBits.push(
      `an extra ${fields.anniversaryService}% off services & ${fields.anniversaryProduct}% off products on your anniversary week`,
    )
  }
  const lines = [
    `*${settings.salonName}*`,
    ``,
    `Hi ${membership.clientName}! 🎉`,
    `You're now enrolled in our *${membership.planName}*.`,
    ``,
    `Valid till: ${formatDate(membership.expiryDate)}`,
    fields.service || fields.product
      ? `Enjoy flat ${fields.service}% off on services and ${fields.product}% off on products all through your membership.`
      : null,
    ...bonusBits.map((bit) => `Plus ${bit}!`),
    ``,
    `Amount paid: ${formatCurrency(membership.amountPaid, settings.currencySymbol)}`,
    ``,
    settings.invoiceFooter || `Thank you for choosing ${settings.salonName}!`,
  ].filter((line) => line !== null && line !== undefined)
  return lines.join('\n')
}

export function calcLineTotal(item) {
  const gross = item.price * item.qty
  const discountPercent = Number(item.discountPercent) || 0
  const discount = gross * (discountPercent / 100)
  return { gross, discount, net: gross - discount }
}

export function calcBillItemRevenue(bill) {
  const items = bill.items || []
  const nets = items.map((it) => calcLineTotal(it).net)
  const subtotal = nets.reduce((sum, n) => sum + n, 0)
  const discountAmount = Number(bill.discountAmount) || 0
  const ratio = subtotal > 0 ? Math.min(1, discountAmount / subtotal) : 0
  return nets.map((n) => Math.round(n * (1 - ratio) * 100) / 100)
}

// Computes visit-cadence and spend insights for a single client from their
// visit history. Powers the Reports "Customer Insights" tab (and anywhere
// else that wants an at-a-glance sense of how often a client returns and
// how much they're worth per visit) so the app can surface *behavioural*
// data, not just a running total-spent figure.
//
// Visit records aren't guaranteed to carry a real date - imported clients
// (see Clients.jsx bulk import) can have placeholder visits with no `date`
// at all - so date-based math below only ever runs against visits with a
// parseable date, and returns null (not NaN) when there isn't enough clean
// data to compute a cadence.
export function computeClientInsights(client) {
  const visitCount = (client.visits || []).length
  const totalSpent = client.totalSpent || 0
  const avgSpendPerVisit = visitCount > 0 ? totalSpent / visitCount : 0

  const datedVisits = (client.visits || [])
    .map((v) => new Date(v.date))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a - b)

  // Average gap between visits, in days - null until there are at least two
  // validly-dated visits to measure a gap from.
  let avgDaysBetweenVisits = null
  if (datedVisits.length > 1) {
    const first = datedVisits[0]
    const last = datedVisits[datedVisits.length - 1]
    avgDaysBetweenVisits = Math.round((last - first) / 86400000 / (datedVisits.length - 1))
  }

  // Prefer the client's own lastVisit field; fall back to the latest
  // validly-dated visit; null (not "" or an Invalid Date) if neither exists.
  let lastVisit = client.lastVisit && !Number.isNaN(new Date(client.lastVisit).getTime()) ? client.lastVisit : null
  if (!lastVisit && datedVisits.length > 0) lastVisit = datedVisits[datedVisits.length - 1].toISOString()
  const daysSinceLastVisit = lastVisit ? daysSince(lastVisit) : null

  return { visitCount, totalSpent, avgSpendPerVisit, avgDaysBetweenVisits, lastVisit, daysSinceLastVisit }
}

// Buckets a client into a lifecycle segment based on how their current gap
// since last visit compares to their own usual visiting cadence (falling
// back to a flat 30-day assumption for clients with only one visit on
// record, or with no usable visit dates at all). This is what lets Reports
// point staff at *specific* clients worth a retention push instead of just
// a raw "hasn't visited in N days" list.
export function getClientSegment(client) {
  const { visitCount, daysSinceLastVisit, avgDaysBetweenVisits } = computeClientInsights(client)
  if (visitCount === 0) return { label: 'No visits yet', tone: 'muted' }
  if (daysSinceLastVisit === null) return { label: 'New', tone: 'brass' }
  if (visitCount === 1) return { label: 'New', tone: 'brass' }
  const cadence = avgDaysBetweenVisits || 30
  if (daysSinceLastVisit > cadence * 2.5) return { label: 'Lapsed', tone: 'danger' }
  if (daysSinceLastVisit > cadence * 1.5) return { label: 'At risk', tone: 'brass' }
  return { label: 'Regular', tone: 'success' }
}

export function calcBillTotals({ items, discountType, discountValue, taxPercent }) {
  let grossSubtotal = 0
  let itemDiscountTotal = 0
  items.forEach((it) => {
    const { gross, discount } = calcLineTotal(it)
    grossSubtotal += gross
    itemDiscountTotal += discount
  })
  const subtotal = grossSubtotal - itemDiscountTotal
  let discountAmount = 0
  if (discountType === 'percent') {
    discountAmount = (subtotal * (Number(discountValue) || 0)) / 100
  } else if (discountType === 'flat') {
    discountAmount = Number(discountValue) || 0
  }
  discountAmount = Math.min(discountAmount, subtotal)
  const taxable = subtotal - discountAmount
  const taxAmount = (taxable * (Number(taxPercent) || 0)) / 100
  const total = taxable + taxAmount
  return {
    grossSubtotal: Math.round(grossSubtotal * 100) / 100,
    itemDiscountTotal: Math.round(itemDiscountTotal * 100) / 100,
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  }
}
