import * as XLSX from 'xlsx'
import { formatDate, formatCurrency } from './helpers.js'

export function downloadAttendanceExcel(records, staffList, label = 'attendance') {
  const rows = records.map((a) => {
    const member = staffList.find((s) => s.id === a.staffId)
    return {
      'Staff Name': member?.name || 'Removed staff',
      Role: member?.role || '',
      Date: formatDate(a.date),
      Status: a.status,
      'Check-in': a.checkIn || '',
      'Check-out': a.checkOut || '',
    }
  })

  const worksheet = XLSX.utils.json_to_sheet(rows)
  worksheet['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance')

  const filename = `${label}-${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(workbook, filename)
}

// Exports the full services and/or products catalog to a single workbook,
// one sheet per catalog that's passed in. Either list can be omitted (pass
// null/undefined) so the Services and Products pages can each trigger just
// their own sheet, while still sharing one function.
export function downloadCatalogExcel({ services, products, currencySymbol = '\u20B9', label = 'catalog' } = {}) {
  const workbook = XLSX.utils.book_new()

  if (services && services.length >= 0) {
    const rows = services.map((s) => ({
      'Service Name': s.name,
      Category: s.category || '',
      For: s.gender || '',
      'Duration (min)': s.duration || 0,
      Price: s.price || 0,
      'Price (formatted)': formatCurrency(s.price, currencySymbol),
    }))
    const worksheet = XLSX.utils.json_to_sheet(rows)
    worksheet['!cols'] = [{ wch: 26 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Services')
  }

  if (products && products.length >= 0) {
    const rows = products.map((p) => ({
      'Product Name': p.name,
      Category: p.category || '',
      Price: p.price || 0,
      'Price (formatted)': formatCurrency(p.price, currencySymbol),
      Stock: p.stock || 0,
      'Low Stock At': p.lowStockAt ?? 5,
    }))
    const worksheet = XLSX.utils.json_to_sheet(rows)
    worksheet['!cols'] = [{ wch: 26 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products')
  }

  const filename = `${label}-${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(workbook, filename)
}

// Exports all clients/contacts to an Excel workbook.
export function downloadClientsExcel(clients, currencySymbol = '\u20B9', label = 'clients') {
  const rows = clients.map((c) => ({
    'Client Name': c.name || '',
    Phone: c.phone || '',
    Email: c.email || '',
    Gender: c.gender || '',
    Notes: c.notes || '',
    'Total Spent': Number(c.totalSpent || 0),
    'Total Spent (formatted)': formatCurrency(c.totalSpent || 0, currencySymbol),
    Visits: c.visits?.length || 0,
    'Last Visit': c.lastVisit ? formatDate(c.lastVisit) : '',
    'Added On': c.createdAt ? formatDate(c.createdAt) : '',
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)
  worksheet['!cols'] = [
    { wch: 24 },
    { wch: 16 },
    { wch: 30 },
    { wch: 12 },
    { wch: 42 },
    { wch: 14 },
    { wch: 24 },
    { wch: 10 },
    { wch: 16 },
    { wch: 16 },
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients')

  const filename = `${label}-${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(workbook, filename)
}
