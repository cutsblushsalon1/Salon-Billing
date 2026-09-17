export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

// Capitalizes human-readable text without collapsing spaces while the user is typing.
// Example: 'suraj kumar' -> 'Suraj Kumar'.
export function capitalizeWordsPreserveSpaces(value) {
  return String(value ?? '').replace(/(^|\s)(\S)/g, (_, prefix, char) => `${prefix}${char.toUpperCase()}`)
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

// Returns the display names of the individual services included in a combo service.
// Combo services store their component service IDs in `comboServiceIds`.
export function getComboServiceNames(item, services = []) {
  const ids = Array.isArray(item?.comboServiceIds) ? item.comboServiceIds : []
  const byId = new Map((services || []).map((service) => [service.id, service]))
  return ids.map((id) => byId.get(id)?.name).filter(Boolean)
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

// Clamps a configured day-of-month (1-31) to however many days the given
// month actually has, e.g. "31" in February becomes 28 or 29.
export function clampDayToMonth(day, year, month) {
  const requested = Math.min(31, Math.max(1, Number(day) || 1))
  return Math.min(requested, new Date(year, month + 1, 0).getDate())
}

// Everything needed to know (and show) where a staff member's automatic
// Salary is paid on a configured day each month. Advances are assigned to the
// first salary cycle whose pay date is on/after the advance date. This is
// important: an advance paid AFTER this month's salary date must reduce NEXT
// month's salary, not the salary that has already been paid.
//
// Example (salary day = 1):
//   Sep 1 salary cycle + advance on Sep 1 -> September salary
//   Sep 2 advance -> October salary
//   Oct 1 advance -> October salary
export function getSalaryCycleDate(date, settings = {}) {
  const source = date instanceof Date ? new Date(date) : new Date(date)
  if (Number.isNaN(source.getTime())) return null

  const requestedDay = Math.min(31, Math.max(1, Number(settings.autoSalaryExpenseDay) || 1))
  const dayThisMonth = clampDayToMonth(requestedDay, source.getFullYear(), source.getMonth())
  const thisMonthPayDate = new Date(source.getFullYear(), source.getMonth(), dayThisMonth)
  thisMonthPayDate.setHours(0, 0, 0, 0)

  // On payday, the advance belongs to today's cycle. After payday it belongs
  // to the next cycle.
  if (source <= thisMonthPayDate) return thisMonthPayDate

  return new Date(
    source.getFullYear(),
    source.getMonth() + 1,
    clampDayToMonth(requestedDay, source.getFullYear(), source.getMonth() + 1),
  )
}

export function getStaffSalaryStatus(
  staffMember,
  staffAdvances = [],
  settings = {},
  referenceDate = new Date(),
  targetPayDate = null,
) {
  const reference = referenceDate instanceof Date ? new Date(referenceDate) : new Date(referenceDate)
  const requestedDay = Math.min(31, Math.max(1, Number(settings.autoSalaryExpenseDay) || 1))

  // When targetPayDate is supplied (used by automatic expense generation),
  // calculate exactly that salary cycle. Otherwise show the next upcoming
  // salary cycle from the user's current date.
  const cycleDate = targetPayDate
    ? new Date(targetPayDate)
    : getSalaryCycleDate(reference, settings)

  cycleDate.setHours(0, 0, 0, 0)
  const cycleYear = cycleDate.getFullYear()
  const cycleMonth = cycleDate.getMonth()
  const payDay = clampDayToMonth(requestedDay, cycleYear, cycleMonth)

  const grossSalary = Number(staffMember?.salary) || 0

  const advancesForCycle = (staffAdvances || [])
    .filter((a) => a.staffId === staffMember?.id)
    .filter((a) => {
      const advanceDate = new Date(a.date)
      if (Number.isNaN(advanceDate.getTime())) return false
      const advanceCycle = getSalaryCycleDate(advanceDate, settings)
      return (
        advanceCycle &&
        advanceCycle.getFullYear() === cycleYear &&
        advanceCycle.getMonth() === cycleMonth &&
        advanceCycle.getDate() === payDay
      )
    })

  const advancesThisCycle = advancesForCycle.reduce((sum, a) => sum + (Number(a.amount) || 0), 0)

  let eligibleThisCycle = true
  const joined = staffMember?.joinedAt ? new Date(staffMember.joinedAt) : null
  if (joined && !Number.isNaN(joined.getTime())) {
    joined.setHours(0, 0, 0, 0)
    // Staff who join after a salary cycle's pay date start from the next cycle.
    if (joined > cycleDate) eligibleThisCycle = false
  }

  const netPayable = eligibleThisCycle ? Math.max(0, grossSalary - advancesThisCycle) : 0

  const previousCycleDate = new Date(cycleYear, cycleMonth - 1, clampDayToMonth(requestedDay, cycleYear, cycleMonth - 1))
  const nextPayDate = new Date(cycleYear, cycleMonth + 1, clampDayToMonth(requestedDay, cycleYear, cycleMonth + 1))

  return {
    grossSalary,
    advancesThisMonth: advancesThisCycle, // backwards-compatible property name
    advancesThisCycle,
    netPayable,
    eligibleThisCycle,
    payDay,
    payDate: cycleDate,
    nextPayDate,
    nextCycleDate: nextPayDate,
    previousCycleDate,
    cycleKey: `${cycleYear}-${String(cycleMonth + 1).padStart(2, '0')}`,
    cycleLabel: cycleDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
  }
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

// Renders any stored phone number (bare 10-digit local, unchanged) with
// a +91 country code prefix wherever it's shown as read-only text -
// client/staff lists, profiles, invoices. Storage itself stays a plain
// 10-digit number (matching import/export, search, and the WhatsApp
// helpers above); this only affects what's displayed.
export function formatPhoneDisplay(phone) {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '')
  if (!cleanPhone) return ''
  const withCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone
  return `+${withCountry}`
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

// Builds the dynamic values for the approved "membership activated"
// WhatsApp template (see Settings > Membership WhatsApp sending for the
// template copy) directly from the membership + plan, the same way
// buildInvoiceTemplateParams does for invoices:
//   {{1}} name, {{2}} plan name, {{3}} valid-till date, {{4}} amount paid
export function buildMembershipTemplateParams(settings, membership, plan) {
  const name = membership.clientName || 'there'
  const planName = membership.planName || plan?.name || 'Membership'
  const validTill = formatInvoiceTemplateDate(membership.expiryDate)
  const amountPaid = formatCurrency(membership.amountPaid, settings.currencySymbol)
  return {
    body: [name, planName, validTill, amountPaid],
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
// (renderTemplate, below) and, for automatic sending, to fill in the
// fixed approved WhatsApp template's params (see
// buildFollowUpApiTemplateParams).
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

// The approved "follow-up" WhatsApp template's copy (see Settings >
// Follow-up reminders > Automatic sending), shown as a fallback
// reference in Settings and used to render an on-screen preview in
// Follow-ups whenever no synced template is available. What actually
// gets sent is the structured template name + body params
// (buildFollowUpApiTemplateParams below), not this string.
export const FOLLOWUP_API_TEMPLATE_TEXT =
  "Hi {{1}}, it's been {{2}} days since your last visit to *Cuts & Blush Unisex Salon*! We'd love to see you again soon for {{3}}. 💖\n\nBook your next appointment through our website and get *flat 25% off on all services*!"

// Builds the dynamic values for the approved follow-up WhatsApp template
// directly from the client, the same way buildInvoiceTemplateParams does
// for invoices — one fixed, Meta-approved template for every automatic
// follow-up, no per-template variable mapping needed:
//   {{1}} client's name, {{2}} days since last visit, {{3}} last service
// The 25% offer itself is fixed copy in the approved template, not a
// variable — Meta template variables are for personalisation, not for
// changing the deal being offered.
export function buildFollowUpApiTemplateParams(client, settings) {
  const tokens = buildFollowUpTokenValues(client, settings)
  return {
    body: [tokens.clientName, tokens.daysSinceVisit, tokens.lastService],
  }
}

// Renders the follow-up template's copy with a given client's values
// filled in, for on-screen preview only (what actually gets sent is the
// structured template + params, not this string). Prefers the real
// approved body text pulled in via Settings > "Sync template" (so the
// preview matches Meta's actual wording) when it's been synced and still
// matches the configured template name; falls back to the generic
// reference copy above otherwise.
export function previewFollowUpApiTemplate(client, settings) {
  const { body } = buildFollowUpApiTemplateParams(client, settings)
  const synced = settings.followUpSyncedTemplate
  const nameMatches =
    synced && (synced.name || '').trim().toLowerCase() === (settings.followUpTemplateName || '').trim().toLowerCase()
  const text = nameMatches && synced.body_text ? synced.body_text : FOLLOWUP_API_TEMPLATE_TEXT
  let i = 0
  return text.replace(/\{\{\d+\}\}/g, () => body[i++] ?? '')
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
// The free-service perk applies the same way to every member regardless of
// gender — one shared list (`freeServiceIds`) and one shared count
// (`freeServiceCount`) that any enrolled client, male or female, can use.
// Plans saved before this was unified may still carry separate
// `freeServiceIdsMale`/`freeServiceIdsFemale` and
// `freeServiceCountMale`/`freeServiceCountFemale` fields — those are merged
// in automatically (union of both lists, larger of both counts) so nothing
// a salon already configured silently disappears.
export function getPlanFreeServiceIds(plan) {
  if (!plan) return []
  if (Array.isArray(plan.freeServiceIds)) return plan.freeServiceIds
  const male = Array.isArray(plan.freeServiceIdsMale) ? plan.freeServiceIdsMale : []
  const female = Array.isArray(plan.freeServiceIdsFemale) ? plan.freeServiceIdsFemale : []
  return Array.from(new Set([...male, ...female]))
}

export function getPlanFreeServiceCount(plan) {
  if (!plan) return 0
  const hasUnified = plan.freeServiceCount !== undefined && plan.freeServiceCount !== null && plan.freeServiceCount !== ''
  if (hasUnified) return Number(plan.freeServiceCount) || 0
  const male = Number(plan.freeServiceCountMale) || 0
  const female = Number(plan.freeServiceCountFemale) || 0
  return Math.max(male, female)
}

export function getMembershipFreeServiceInfo(membership, plan, refDate = new Date()) {
  if (!membership || !plan) return null
  const serviceIds = getPlanFreeServiceIds(plan)
  const totalFree = getPlanFreeServiceCount(plan)
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

// Category name for services/products that already carry a bundled-in
// discount (e.g. combo packages). Items in this category are exempt from
// every other discount mechanism — manual item discount, membership
// auto-discount, free-service claims, and whole-bill flat/percent discount
// — so a second discount is never stacked on top of one they already have.
// Matched case-insensitively so "Special Combo", "special combo", etc. all
// count.
export const NO_DISCOUNT_CATEGORY = 'Special Combo'

export function isNoDiscountCategory(category) {
  return String(category || '').trim().toLowerCase() === NO_DISCOUNT_CATEGORY.toLowerCase()
}

export function calcLineTotal(item) {
  const gross = item.price * item.qty
  // Special Combo items are already discounted in their listed price, so no
  // further discount is ever applied here, regardless of what discountPercent
  // holds (e.g. left over from a membership auto-discount or a free claim).
  const discountPercent = isNoDiscountCategory(item.category) ? 0 : Number(item.discountPercent) || 0
  const discount = gross * (discountPercent / 100)
  return { gross, discount, net: gross - discount }
}

export function calcBillItemRevenue(bill) {
  const items = bill.items || []
  const nets = items.map((it) => calcLineTotal(it).net)
  const discountAmount = Number(bill.discountAmount) || 0
  // The whole-bill flat/percent discount is only ever spread across items
  // that are allowed to be discounted — Special Combo items keep their full
  // net revenue regardless of a bill-level discount.
  const discountableNet = items.reduce((sum, it, idx) => (isNoDiscountCategory(it.category) ? sum : sum + nets[idx]), 0)
  const ratio = discountableNet > 0 ? Math.min(1, discountAmount / discountableNet) : 0
  return items.map((it, idx) => {
    if (isNoDiscountCategory(it.category)) return Math.round(nets[idx] * 100) / 100
    return Math.round(nets[idx] * (1 - ratio) * 100) / 100
  })
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
  let discountableSubtotal = 0
  items.forEach((it) => {
    const { gross, discount, net } = calcLineTotal(it)
    grossSubtotal += gross
    itemDiscountTotal += discount
    // Special Combo items are already discounted, so they're excluded from
    // the pool the whole-bill flat/percent discount is calculated against —
    // otherwise a bill-wide discount would quietly shave their price too.
    if (!isNoDiscountCategory(it.category)) discountableSubtotal += net
  })
  const subtotal = grossSubtotal - itemDiscountTotal
  let discountAmount = 0
  if (discountType === 'percent') {
    discountAmount = (discountableSubtotal * (Number(discountValue) || 0)) / 100
  } else if (discountType === 'flat') {
    discountAmount = Number(discountValue) || 0
  }
  discountAmount = Math.min(discountAmount, discountableSubtotal)
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
