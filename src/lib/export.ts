import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export type Row = Record<string, string | number | null | undefined>

function download(blob: Blob, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

export function exportCSV(rows: Row[], name: string) {
  if (!rows.length) return
  const cols = Object.keys(rows[0])
  const esc = (v: any) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n')
  download(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }), `${name}.csv`)
}

export function exportXLSX(rows: Row[], name: string) {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Data')
  XLSX.writeFile(wb, `${name}.xlsx`)
}

export function exportPDF(rows: Row[], name: string, title = name) {
  if (!rows.length) return
  const doc = new jsPDF({ orientation: rows.length && Object.keys(rows[0]).length > 6 ? 'landscape' : 'portrait' })
  doc.setFontSize(14)
  doc.text(title, 14, 15)
  const cols = Object.keys(rows[0])
  autoTable(doc, { startY: 22, head: [cols], body: rows.map((r) => cols.map((c) => String(r[c] ?? ''))), styles: { fontSize: 8 }, headStyles: { fillColor: [21, 128, 61] } })
  doc.save(`${name}.pdf`)
}

// PDF uses the Latin-only default font; Rs. is used in place of the rupee glyph.
export function billPDF(opts: { farm: string; customer: string; month: string; rate: string; lines: string[][]; totalL: number; total: number; paid: number; balance: number }) {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text(opts.farm, 14, 16)
  doc.setFontSize(11)
  doc.text(`Milk bill - ${opts.month}`, 14, 24)
  doc.text(`Customer: ${opts.customer}`, 14, 31)
  autoTable(doc, { startY: 37, head: [['Date', 'Shift', 'Litres', 'Rate', 'Amount']], body: opts.lines, styles: { fontSize: 9 }, headStyles: { fillColor: [21, 128, 61] } })
  const y = (doc as any).lastAutoTable.finalY + 8
  doc.text(`Total litres: ${opts.totalL.toFixed(1)}`, 14, y)
  doc.text(`Total amount: Rs. ${opts.total.toFixed(2)}`, 14, y + 7)
  doc.text(`Paid: Rs. ${opts.paid.toFixed(2)}`, 14, y + 14)
  doc.setFontSize(13)
  doc.text(`Balance: Rs. ${opts.balance.toFixed(2)}`, 14, y + 23)
  doc.save(`bill-${opts.customer}-${opts.month}.pdf`)
}
