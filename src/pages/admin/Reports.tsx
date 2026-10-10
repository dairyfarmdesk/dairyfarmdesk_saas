import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAnimals, useCash, useExpenses, useLabourPayments, useLedger, useMedical, useMilk, useSales } from '@/lib/data'
import { Button, Card, Input, Segmented } from '@/components/ui'
import { DataTable } from '@/components/DataTable'
import { exportCSV, exportPDF, type Row } from '@/lib/export'
import { buildReport, type ReportTab } from '@/lib/reports'
import { fmtDate, inr, L, todayIST, yearStart } from '@/lib/format'
import { sum } from '@/lib/utils'

const TABS: ReportTab[] = ['daily', 'monthly', 'yearly', 'pnl', 'dues', 'yield']

export default function Reports() {
  const { t } = useTranslation()
  const today = todayIST()
  const [tab, setTab] = useState<ReportTab>('monthly')
  const [from, setFrom] = useState(yearStart(today))
  const [to, setTo] = useState(today)
  const { data: milk = [] } = useMilk(from, to)
  const { data: sales = [] } = useSales(from, to)
  const { data: cash = [] } = useCash(from, to)
  const { data: exp = [] } = useExpenses(from, to)
  const { data: med = [] } = useMedical()
  const { data: labourAll = [] } = useLabourPayments()
  const labour = labourAll.filter((p) => p.entry_date >= from && p.entry_date <= to)
  const { data: ledger = [] } = useLedger()
  const { data: animals = [] } = useAnimals()

  const rows: Row[] = useMemo(
    () => buildReport(tab, { milk, sales, cash, exp, med, labour, ledger: ledger.map((l) => ({ ...l })), animals, from, to }),
    [tab, milk, sales, cash, exp, med, labourAll, ledger, animals, from, to],
  )
  const cols = rows.length ? Object.keys(rows[0]) : []
  const label = t('reports.' + tab)
  const periodic = tab === 'daily' || tab === 'monthly' || tab === 'yearly'
  const tot = periodic
    ? { prod: sum(rows, (r) => Number(r['Produced (L)'])), rev: sum(rows, (r) => Number(r.Revenue)), exp: sum(rows, (r) => Number(r.Expenses)), profit: sum(rows, (r) => Number(r.Profit)) }
    : null

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-brand-900">{t('nav.reports')}</h1>
      <div className="overflow-x-auto">
        <Segmented<ReportTab> value={tab} onChange={setTab} options={TABS.map((v) => ({ v, label: t('reports.' + v) }))} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input type="date" className="!w-full sm:!w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" className="!w-full sm:!w-40" value={to} onChange={(e) => setTo(e.target.value)} />
        <Button size="sm" variant="outline" onClick={() => exportCSV(rows, `report-${tab}`)}>{t('csv')}</Button>
        <Button size="sm" variant="outline" onClick={() => exportPDF(rows, `report-${tab}`, `${label} (${fmtDate(from)} - ${fmtDate(to)})`)}>{t('pdf')}</Button>
      </div>
      {tot && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card><div className="text-xs text-gray-500">{t('milk.title')}</div><div className="text-xl font-extrabold">{L(tot.prod)} L</div></Card>
          <Card><div className="text-xs text-gray-500">{t('admin.revenue')}</div><div className="text-xl font-extrabold">{inr(tot.rev)}</div></Card>
          <Card><div className="text-xs text-gray-500">{t('admin.expenses')}</div><div className="text-xl font-extrabold">{inr(tot.exp)}</div></Card>
          <Card><div className="text-xs text-gray-500">{t('admin.profit')}</div><div className={`text-xl font-extrabold ${tot.profit < 0 ? 'text-red-700' : 'text-brand-700'}`}>{inr(tot.profit)}</div></Card>
        </div>
      )}
      <DataTable
        key={tab} rows={rows} exportName={`report-${tab}`} rowKey={(r) => JSON.stringify(Object.values(r))} pageSize={20}
        cols={cols.map((c) => ({ key: c, header: c, value: (r: Row) => r[c], align: typeof rows[0]?.[c] === 'number' ? ('right' as const) : undefined }))}
      />
    </div>
  )
}
