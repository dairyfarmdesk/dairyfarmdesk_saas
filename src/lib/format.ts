// All dates are handled as 'YYYY-MM-DD' strings in Asia/Kolkata. Display format is DD-MM-YYYY.
const TZ = 'Asia/Kolkata'

export const todayIST = (): string => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())

export const currentShift = (): 'Morning' | 'Evening' => {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }).format(new Date()))
  return h < 15 ? 'Morning' : 'Evening'
}

export const fmtDate = (iso?: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('-') : '')

export const fmtDateTime = (iso?: string | null) =>
  iso
    ? new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
        .format(new Date(iso))
        .replace(/\//g, '-')
        .replace(',', '')
    : ''

export const addDays = (iso: string, n: number): string => {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return dt.toISOString().slice(0, 10)
}

export const monthStart = (iso: string) => iso.slice(0, 7) + '-01'
export const monthEnd = (iso: string) => {
  const [y, m] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
}
export const yearStart = (iso: string) => iso.slice(0, 4) + '-01-01'
export const diffDays = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000)

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 })
export const inr = (n: number | string | null | undefined) => '₹' + inrFmt.format(Number(n) || 0)
export const L = (n: number | string | null | undefined, d = 1) => (Number(n) || 0).toFixed(d)
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
export const toNum = (v: string | number | null | undefined) => {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
