import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAnimals, useMedical } from '@/lib/data'
import { useSave } from '@/lib/useSave'
import { Badge, Button, Card, Modal } from '@/components/ui'
import { DataTable, DateRange } from '@/components/DataTable'
import { MedicalForm } from '@/pages/manager/HealthPage'
import { addDays, diffDays, fmtDate, inr, todayIST } from '@/lib/format'

export default function AdminHealth() {
  const { t } = useTranslation()
  const save = useSave()
  const today = todayIST()
  const [from, setFrom] = useState('2000-01-01')
  const [to, setTo] = useState(addDays(today, 365))
  const [adding, setAdding] = useState(false)
  const { data: med = [] } = useMedical()
  const { data: animals = [] } = useAnimals()
  const tag = (id: string) => animals.find((a) => a.id === id)
  const rows = med.filter((m) => m.entry_date >= from && m.entry_date <= to)
  const upcoming = med.filter((m) => m.next_due_date && m.next_due_date <= addDays(today, 7)).sort((a, b) => a.next_due_date!.localeCompare(b.next_due_date!))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-brand-900">{t('nav.health')}</h1>
        <Button onClick={() => setAdding(true)}>+ {t('add')}</Button>
      </div>
      <Card>
        <h2 className="mb-2 font-bold">{t('health.upcoming')}</h2>
        <div className="grid gap-2 md:grid-cols-2">
          {upcoming.map((m) => {
            const late = diffDays(today, m.next_due_date!) < 0
            return (
              <Link key={m.id} to={`/admin/animals/${m.animal_id}`} className={`rounded-lg p-2 text-sm ${late ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900'}`}>
                <b>{tag(m.animal_id)?.tag_no}</b> · {m.type} · {fmtDate(m.next_due_date)} {late && '(overdue)'}
              </Link>
            )
          })}
          {!upcoming.length && <div className="text-gray-500">{t('home.noAlerts')}</div>}
        </div>
      </Card>
      <DataTable
        rows={rows} exportName="medical-records" rowKey={(m) => m.id}
        toolbar={<DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />}
        cols={[
          { key: 'd', header: t('date'), value: (m) => fmtDate(m.entry_date) },
          { key: 'a', header: t('milk.animal'), value: (m) => tag(m.animal_id)?.tag_no },
          { key: 't', header: t('type'), value: (m) => m.type },
          { key: 's', header: t('health.symptoms'), value: (m) => m.symptoms },
          { key: 'm', header: t('health.medicine'), value: (m) => m.medicine },
          { key: 'do', header: t('health.dose'), value: (m) => m.dose },
          { key: 'v', header: t('health.vet'), value: (m) => m.vet_name },
          { key: 'c', header: t('health.cost'), value: (m) => Number(m.cost), render: (m) => inr(m.cost), align: 'right' },
          { key: 'w', header: t('health.withdrawalDays'), value: (m) => m.withdrawal_days, render: (m) => (m.withdrawal_days ? <Badge tone="red">{m.withdrawal_days}</Badge> : '–'), align: 'right' },
          { key: 'n', header: t('health.nextDue'), value: (m) => fmtDate(m.next_due_date) },
        ]}
        actions={(m) => <Button size="sm" variant="ghost" className="text-red-600" onClick={() => window.confirm(t('delete') + '?') && save('medical_records', 'delete', undefined, { id: m.id })}>{t('delete')}</Button>}
      />
      <Modal open={adding} onClose={() => setAdding(false)} title={t('health.title')}><MedicalForm onDone={() => setAdding(false)} /></Modal>
    </div>
  )
}
