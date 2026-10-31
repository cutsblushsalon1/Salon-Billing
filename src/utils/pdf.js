import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency, formatDate, calcLineTotal, getBillStaffNames, getItemStaff, formatPhoneDisplay, formatTimeLabel } from './helpers.js'

export function downloadBillPDF(bill, settings) {
  const isReceipt = !!bill.isAdvanceReceipt
  const advancePaid = Number(isReceipt ? bill.advanceAmount : bill.advancePaid) || 0
  const cs = settings.currencySymbol
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const margin = 40
  let y = margin

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor('#5B2333')
  doc.text(settings.salonName, margin, y)
  y += 20

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor('#1F1420')
  doc.text(settings.tagline || '', margin, y)
  y += 14
  doc.text(settings.address || '', margin, y)
  y += 14
  doc.text(`${settings.phone || ''}  ${settings.email || ''}`, margin, y)
  y += 26

  doc.setDrawColor('#C79A4B')
  doc.setLineWidth(1)
  doc.line(margin, y, 555, y)
  y += 24

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`${isReceipt ? 'Advance Receipt' : 'Invoice'} ${bill.billNo}`, margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(formatDate(bill.date), 555, y, { align: 'right' })
  y += 18

  doc.setFontSize(10)
  doc.text(`Bill to: ${bill.client?.name || 'Walk-in Customer'}`, margin, y)
  y += 14
  if (bill.client?.phone) {
    doc.text(`Phone: ${formatPhoneDisplay(bill.client.phone)}`, margin, y)
    y += 14
  }
  if (isReceipt) {
    doc.text(
      `Appointment: ${formatDate(bill.scheduledDate)}${bill.scheduledTime ? ` at ${formatTimeLabel(bill.scheduledTime)}` : ''}`,
      margin,
      y,
    )
    y += 14
  }
  const staffNames = getBillStaffNames(bill)
  if (staffNames.length > 0) {
    doc.text(`Served by: ${staffNames.join(', ')}`, margin, y)
    y += 14
  }
  y += 10

  const hasItemDiscounts = bill.items.some((it) => Number(it.discountPercent) > 0)
  const hasStaffColumn = bill.items.some((it) => getItemStaff(it).length > 0)

  autoTable(doc, {
    startY: y,
    head: [
      ['Item', 'Type', ...(hasStaffColumn ? ['Staff'] : []), 'Qty', 'Price', ...(hasItemDiscounts ? ['Disc %'] : []), 'Amount'],
    ],
    body: bill.items.map((it) => {
      const line = calcLineTotal(it)
      const row = [it.name, it.type === 'service' ? 'Service' : 'Product']
      if (hasStaffColumn) row.push(getItemStaff(it).map((x) => x.name).filter(Boolean).join(' & ') || '—')
      row.push(String(it.qty), formatCurrency(it.price, settings.currencySymbol))
      if (hasItemDiscounts) row.push(it.discountPercent ? `${it.discountPercent}%` : '—')
      row.push(formatCurrency(line.net, settings.currencySymbol))
      return row
    }),
    theme: 'grid',
    headStyles: { fillColor: [91, 35, 51], textColor: 255, fontSize: 10 },
    styles: { fontSize: 9, cellPadding: 6 },
    margin: { left: margin, right: margin },
  })

  let finalY = doc.lastAutoTable.finalY + 20

  const summaryLines = [
    ['Subtotal', formatCurrency(bill.grossSubtotal ?? bill.subtotal, settings.currencySymbol)],
    bill.itemDiscountTotal ? ['Item discounts', `-${formatCurrency(bill.itemDiscountTotal, settings.currencySymbol)}`] : null,
    bill.discountAmount ? ['Discount', `-${formatCurrency(bill.discountAmount, settings.currencySymbol)}`] : null,
    bill.taxAmount ? [`Tax (${bill.taxPercent}%)`, formatCurrency(bill.taxAmount, settings.currencySymbol)] : null,
  ].filter(Boolean)

  doc.setFontSize(10)
  summaryLines.forEach(([label, val]) => {
    doc.text(label, 400, finalY)
    doc.text(val, 555, finalY, { align: 'right' })
    finalY += 16
  })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(isReceipt ? 'Estimated total' : 'Total', 400, finalY)
  doc.text(formatCurrency(bill.total, cs), 555, finalY, { align: 'right' })
  finalY += 20

  if (isReceipt || advancePaid > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const applied = isReceipt ? advancePaid : Number(bill.advanceApplied) || 0
    doc.text(isReceipt ? 'Advance paid' : `Advance paid${bill.advanceReceiptNo ? ` (${bill.advanceReceiptNo})` : ''}`, 400, finalY)
    doc.text(`-${formatCurrency(applied, cs)}`, 555, finalY, { align: 'right' })
    finalY += 16
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(isReceipt ? 'Balance due' : 'Balance paid', 400, finalY)
    const balance = isReceipt ? Math.max(0, (Number(bill.total) || 0) - advancePaid) : Number(bill.balanceDue) || 0
    doc.text(formatCurrency(balance, cs), 555, finalY, { align: 'right' })
    finalY += 18
    if (!isReceipt && (Number(bill.refundDue) || 0) > 0) {
      doc.setFontSize(10)
      doc.text('Refund due to client', 400, finalY)
      doc.text(formatCurrency(bill.refundDue, cs), 555, finalY, { align: 'right' })
      finalY += 18
    }
    finalY += 6
  } else {
    finalY += 4
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor('#8A8290')
  doc.text(
    isReceipt
      ? `Advance paid via ${bill.advanceMethod}. This is an advance receipt, not a final invoice.`
      : advancePaid > 0 && bill.advanceMethod
        ? `Advance via ${bill.advanceMethod}${(Number(bill.balanceDue) || 0) > 0 ? `, balance via ${bill.paymentMethod}` : ''}`
        : `Paid via ${bill.paymentMethod}`,
    margin,
    finalY,
  )
  finalY += 20

  if (settings.invoiceFooter) {
    doc.text(settings.invoiceFooter, margin, finalY, { maxWidth: 500 })
  }

  doc.save(`${bill.billNo}.pdf`)
}
