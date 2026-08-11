export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
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
  const lines = [
    `*${settings.salonName}*`,
    ``,

    `Invoice: ${bill.billNo}`,
    `Date: ${formatDate(bill.date)}`,
    ``,

    `*SERVICES*`,

    ...bill.items.map(
      (it) =>
        `* ${it.name} x${it.qty} - ${formatCurrency(
          it.price * it.qty,
          settings.currencySymbol
        )}`
    ),

    ``,

    `Subtotal: ${formatCurrency(
      bill.subtotal,
      settings.currencySymbol
    )}`,

    bill.discountAmount
      ? `Discount: -${formatCurrency(
          bill.discountAmount,
          settings.currencySymbol
        )}`
      : null,

    bill.taxAmount
      ? `Tax (${bill.taxPercent}%): ${formatCurrency(
          bill.taxAmount,
          settings.currencySymbol
        )}`
      : null,

    ``,

    `*Total: ${formatCurrency(
      bill.total,
      settings.currencySymbol
    )}*`,

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

  return lines.join("\n");
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

export function calcLineTotal(item) {
  const gross = item.price * item.qty
  const discountPercent = Number(item.discountPercent) || 0
  const discount = gross * (discountPercent / 100)
  return { gross, discount, net: gross - discount }
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
