import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCash } from '@/lib/data'
import { useSave } from '@/lib/useSave'
import { Button, Segmented } from '@/components/ui'
import { DataTable, DateRange } from '@/components/DataTable'
import CashPanel from '@/components/CashPanel'
import { addDays, fmtDate, inr, L, todayIST } from '@/lib/format'
import { sum } from '@/lib/utils'

type Tab = 'entry' | 'all'

export default function AdminCash() {
  const { t } = useTranslation()
  const save = useSave()
  const today = todayIST()
  const [tab, setTab] = useState<Tab>('entry')
  const [from, setFrom] = useState(addDays(today, -29))
  const [to, setTo] = useState(today)
  const { data = [] } = useCash(from, to)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-brand-900">{t('nav.cash')}</h1>
      <Segmented<Tab> value={tab} onChange={setTab} options={[{ v: 'entry', label: t('cash.entryTab') }, { v: 'all', label: t('cash.allTab') }]} />
      {tab === 'entry' && <div className="max-w-2xl"><CashPanel /></div>}
      {tab === 'all' && (
        <DataTable
          rows={data} exportName="cash-collections" rowKey={(r) => r.id}
          toolbar={<><DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} /><span className="font-bold text-brand-800">{t('total')}: {inr(sum(data, (r) => r.amount))}</span></>}
          cols={[
            { key: 'd', header: t('date'), value: (r) => fmtDate(r.entry_date) },
            { key: 'a', header: t('cash.collected'), value: (r) => Number(r.amount), render: (r) => inr(r.amount), align: 'right' },
            { key: 'l', header: t('litres'), value: (r) => (r.litres ? Number(r.litres) : ''), render: (r) => (r.litres ? L(r.litres) : '–'), align: 'right' },
            { key: 'h', header: t('cash.handedTo'), value: (r) => r.handed_to },
            { key: 'n', header: t('notes'), value: (r) => r.note },
          ]}
          actions={(r) => <Button size="sm" variant="ghost" className="text-red-600" onClick={() => window.confirm(t('delete') + '?') && save('cash_collections', 'delete', undefined, { id: r.id })}>{t('delete')}</Button>}
        />
      )}
    </div>
  )
}
