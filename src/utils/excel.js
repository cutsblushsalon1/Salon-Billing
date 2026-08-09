import * as XLSX from 'xlsx'
import { formatDate } from './helpers.js'

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
