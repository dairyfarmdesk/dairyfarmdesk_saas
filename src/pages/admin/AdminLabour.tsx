import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLabourPayments, useLabourers } from '@/lib/data'
import { useSave } from '@/lib/useSave'
import { Badge, Button, Segmented } from '@/components/ui'
import { DataTable, DateRange } from '@/components/DataTable'
import LabourPanel from '@/components/LabourPanel'
import { addDays, fmtDate, inr, todayIST } from '@/lib/format'
import { sum } from '@/lib/utils'

type Tab = 'workers' | 'all'

export default function AdminLabour() {
  const { t } = useTranslation()
  const save = useSave()
  const today = todayIST()
  const [tab, setTab] = useState<Tab>('workers')
  const [from, setFrom] = useState(addDays(today, -89))
  const [to, setTo] = useState(today)
  const { data: workers = [] } = useLabourers()
  const { data: pays = [] } = useLabourPayments()
  const name = (id: string) => workers.find((w) => w.id === id)?.name ?? ''
  const rows = pays.filter((p) => p.entry_date >= from && p.entry_date <= to)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-brand-900">{t('nav.labour')}</h1>
      <Segmented<Tab> value={tab} onChange={setTab} options={[{ v: 'workers', label: t('labour.workers') }, { v: 'all', label: t('labour.allPayments') }]} />
      {tab === 'workers' && <div className="max-w-2xl"><LabourPanel /></div>}
      {tab === 'all' && (
        <DataTable
          rows={rows} exportName="labour-payments" rowKey={(p) => p.id}
          toolbar={<><DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} /><span className="font-bold text-brand-800">{t('total')}: {inr(sum(rows, (p) => p.amount))}</span></>}
          cols={[
            { key: 'd', header: t('date'), value: (p) => fmtDate(p.entry_date) },
            { key: 'w', header: t('labour.worker'), value: (p) => name(p.labour_id) },
            { key: 't', header: t('type'), value: (p) => p.pay_type, render: (p) => <Badge tone={p.pay_type === 'Advance' ? 'amber' : 'green'}>{p.pay_type}</Badge> },
            { key: 'a', header: t('amount'), value: (p) => Number(p.amount), render: (p) => inr(p.amount), align: 'right' },
            { key: 'm', header: t('cust.mode'), value: (p) => p.mode },
            { key: 'n', header: t('notes'), value: (p) => p.note },
          ]}
          actions={(p) => <Button size="sm" variant="ghost" className="text-red-600" onClick={() => window.confirm(t('delete') + '?') && save('labour_payments', 'delete', undefined, { id: p.id })}>{t('delete')}</Button>}
        />
      )}
    </div>
  )
}
