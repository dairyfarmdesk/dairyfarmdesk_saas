import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useExpenses } from '@/lib/data'
import { Card, Input } from '@/components/ui'
import DeleteButton from '@/components/DeleteButton'
import { fmtDate, inr, monthEnd, monthStart, todayIST } from '@/lib/format'
import { groupBy, sum } from '@/lib/utils'

/** Day / month totals, category totals and a date-filterable list (manager Expenses page). */
export default function ExpenseSummary() {
  const { t } = useTranslation()
  const today = todayIST()
  const { data: month = [] } = useExpenses(monthStart(today), monthEnd(today))
  const [filterDate, setFilterDate] = useState('')
  const todayRows = month.filter((e) => e.entry_date === today)
  const byCat = groupBy(month, (e) => e.category)
  const list = filterDate ? month.filter((e) => e.entry_date === filterDate) : month.slice(0, 30)

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Card className="!p-3"><div className="text-xs text-gray-600">{t('exp.daily')}</div><div className="text-2xl font-extrabold text-brand-800">{inr(sum(todayRows, (e) => e.amount))}</div></Card>
        <Card className="!p-3"><div className="text-xs text-gray-600">{t('exp.monthly')}</div><div className="text-2xl font-extrabold text-brand-800">{inr(sum(month, (e) => e.amount))}</div></Card>
      </div>
      <Card>
        <h2 className="mb-2 font-extrabold text-brand-900">{t('exp.byCategory')} ({t('exp.monthly')})</h2>
        {Object.entries(byCat).map(([c, r]) => (
          <div key={c} className="flex justify-between border-b border-gray-100 py-1"><span>{c}</span><b>{inr(sum(r, (e) => e.amount))}</b></div>
        ))}
      </Card>
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-lg font-extrabold text-brand-900">{t('nav.expenses')}</h2>
        <Input type="date" className="!w-40" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
      </div>
      <Card className="divide-y divide-gray-100 !p-0">
        {list.map((e) => (
          <div key={e.id} className="flex items-center justify-between px-4 py-2">
            <div><div className="font-bold">{e.item_name}</div><div className="text-xs text-gray-600">{fmtDate(e.entry_date)} · {e.category}{e.supplier ? ` · ${e.supplier}` : ''}</div></div>
            <div className="flex items-center"><div className="font-extrabold">{inr(e.amount)}</div><DeleteButton table="expenses" id={e.id} date={e.entry_date} label={e.item_name} /></div>
          </div>
        ))}
        {!list.length && <div className="p-4 text-center text-gray-500">{t('noData')}</div>}
      </Card>
    </>
  )
}
