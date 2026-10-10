import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Download } from 'lucide-react'
import { Button, Input } from './ui'
import { exportCSV, exportPDF, exportXLSX, type Row } from '@/lib/export'

export interface Col<T> {
  key: string
  header: string
  render?: (r: T) => ReactNode
  /** plain value used for search, sort and export */
  value: (r: T) => string | number | null | undefined
  align?: 'right'
}

interface Props<T> {
  rows: T[]
  cols: Col<T>[]
  exportName: string
  toolbar?: ReactNode
  actions?: (r: T) => ReactNode
  pageSize?: number
  rowKey: (r: T) => string
}

export function DataTable<T>({ rows, cols, exportName, toolbar, actions, pageSize = 15, rowKey }: Props<T>) {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<{ k: string; asc: boolean } | null>(null)

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    let r = s ? rows.filter((x) => cols.some((c) => String(c.value(x) ?? '').toLowerCase().includes(s))) : rows
    if (sort) {
      const c = cols.find((c) => c.key === sort.k)
      if (c)
        r = [...r].sort((a, b) => {
          const x = c.value(a) ?? '', y = c.value(b) ?? ''
          const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))
          return sort.asc ? cmp : -cmp
        })
    }
    return r
  }, [rows, q, sort, cols])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const cur = Math.min(page, pages - 1)
  const view = filtered.slice(cur * pageSize, cur * pageSize + pageSize)
  const exportRows = (): Row[] => filtered.map((r) => Object.fromEntries(cols.map((c) => [c.header, c.value(r)])))

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 p-3">
        <Input className="!h-10 w-full sm:max-w-[220px]" placeholder={t('search')} value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} />
        {toolbar}
        <div className="flex w-full flex-wrap items-center gap-1 sm:ml-auto sm:w-auto">
          <Download className="h-4 w-4 text-gray-500" />
          <Button size="sm" variant="outline" onClick={() => exportCSV(exportRows(), exportName)}>{t('csv')}</Button>
          <Button size="sm" variant="outline" onClick={() => exportXLSX(exportRows(), exportName)}>{t('excel')}</Button>
          <Button size="sm" variant="outline" onClick={() => exportPDF(exportRows(), exportName)}>{t('pdf')}</Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-50 text-brand-900">
            <tr>
              {cols.map((c) => (
                <th
                  key={c.key}
                  onClick={() => setSort((s) => ({ k: c.key, asc: s?.k === c.key ? !s.asc : true }))}
                  className={`cursor-pointer select-none whitespace-nowrap px-3 py-2 font-bold ${c.align === 'right' ? 'text-right' : ''}`}
                >
                  {c.header}
                  {sort?.k === c.key ? (sort.asc ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
              {actions && <th className="px-3 py-2 text-right font-bold">{t('actions')}</th>}
            </tr>
          </thead>
          <tbody>
            {view.map((r) => (
              <tr key={rowKey(r)} className="border-t border-gray-100 hover:bg-gray-50">
                {cols.map((c) => (
                  <td key={c.key} className={`whitespace-nowrap px-3 py-2 ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                    {c.render ? c.render(r) : String(c.value(r) ?? '')}
                  </td>
                ))}
                {actions && <td className="whitespace-nowrap px-3 py-2 text-right">{actions(r)}</td>}
              </tr>
            ))}
            {!view.length && (
              <tr><td colSpan={cols.length + 1} className="p-8 text-center text-gray-500">{t('noData')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col items-center justify-between gap-2 border-t border-gray-200 p-3 text-sm text-gray-600 sm:flex-row">
        <span>{filtered.length} {t('rows')}</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={cur === 0} onClick={() => setPage(cur - 1)}>{t('prev')}</Button>
          <span>{t('page')} {cur + 1}/{pages}</span>
          <Button size="sm" variant="outline" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>{t('next')}</Button>
        </div>
      </div>
    </div>
  )
}

export function DateRange({ from, to, setFrom, setTo }: { from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center gap-1 text-sm">
      <span className="text-gray-600">{t('from')}</span>
      <Input type="date" className="!h-10 !w-36" value={from} onChange={(e) => setFrom(e.target.value)} />
      <span className="text-gray-600">{t('to')}</span>
      <Input type="date" className="!h-10 !w-36" value={to} onChange={(e) => setTo(e.target.value)} />
    </div>
  )
}
