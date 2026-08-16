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

export function whatsappBillMessage(settings, bill) {
  const itemLines = bill.items.flatMap((it) => {
    const line = calcLineTotal(it)
    const base = `* ${it.name} x${it.qty} - ${formatCurrency(line.gross, settings.currencySymbol)}`
    if (line.discount > 0) {
      return [base, `   ↳ ${it.discountPercent}% off - ${formatCurrency(line.net, settings.currencySymbol)}`]
    }
    return [base]
  })

  const lines = [
    `*${settings.salonName}*`,
    ``,

    `Invoice: ${bill.billNo}`,
    `Date: ${formatDate(bill.date)}`,
    ``,

    `*SERVICES*`,
    ...itemLines,
    ``,

    `Subtotal: ${formatCurrency(bill.grossSubtotal ?? bill.subtotal, settings.currencySymbol)}`,
    bill.itemDiscountTotal ? `Item discounts: -${formatCurrency(bill.itemDiscountTotal, settings.currencySymbol)}` : null,
    bill.discountAmount ? `Discount: -${formatCurrency(bill.discountAmount, settings.currencySymbol)}` : null,
    bill.taxAmount ? `Tax (${bill.taxPercent}%): ${formatCurrency(bill.taxAmount, settings.currencySymbol)}` : null,
    ``,

    `*Total: ${formatCurrency(bill.total, settings.currencySymbol)}*`,
    ``,

    `Paid via: ${bill.paymentMethod}`,
    ``,

    settings.invoiceFooter ||
      `Thanks for visiting ${settings.salonName}!`,

    ``,

    `Your feedback means a lot to us!`,

    ``,

    `Leave us a Google Review:`,
    `https://maps.app.goo.gl/B6WfRGDBtWYnpk9e8`,
  ].filter((line) => line !== null && line !== undefined);
  return lines.join('\n')
}

export function whatsappLink(phone, message) {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '')
  const withCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`
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

export function buildFollowUpMessage(template, client, settings) {
  const tokens = {
    clientName: client.name,
    salonName: settings.salonName,
    lastVisitDate: client.lastVisit ? formatDate(client.lastVisit) : '',
    daysSinceVisit: client.lastVisit ? String(daysSince(client.lastVisit)) : '',
    lastService: getClientLastService(client) || 'next service',
  }
  return renderTemplate(template.body, tokens)
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
// "2 free haircuts"), available only from services on the plan's own
// `freeServiceIds` list, capped at `freeServiceCount` redemptions total, and
// only within `freeServiceValidityMonths` of the membership's start date
// (falling back to the membership's own validity period if that's left
// blank). Once the count or the window runs out, the plan's normal % discount
// applies instead — the free perk never blocks the regular member discount.
export function getMembershipFreeServiceInfo(membership, plan, refDate = new Date()) {
  if (!membership || !plan) return null
  const serviceIds = Array.isArray(plan.freeServiceIds) ? plan.freeServiceIds : []
  const totalFree = Number(plan.freeServiceCount) || 0
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
