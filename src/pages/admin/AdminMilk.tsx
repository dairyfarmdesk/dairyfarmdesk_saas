import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAnimals, useMilk } from '@/lib/data'
import { useSave } from '@/lib/useSave'
import { Button, Card, Select } from '@/components/ui'
import { DataTable, DateRange } from '@/components/DataTable'
import EditMilk from '@/components/EditMilk'
import { addDays, fmtDate, L, todayIST } from '@/lib/format'
import { groupBy, sum } from '@/lib/utils'
import type { Milk } from '@/lib/types'

const weekKey = (iso: string) => {
  const d = new Date(iso + 'T00:00:00Z')
  const day = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - day)
  return d.toISOString().slice(0, 10)
}

export default function AdminMilk() {
  const { t } = useTranslation()
  const today = todayIST()
  const [from, setFrom] = useState(addDays(today, -29))
  const [to, setTo] = useState(today)
  const [animalId, setAnimalId] = useState('')
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day')
  const [edit, setEdit] = useState<Milk | null>(null)
  const { data: animals = [] } = useAnimals()
  const { data: milk = [] } = useMilk(from, to)
  const save = useSave()
  const tag = (id: string) => animals.find((a) => a.id === id)?.tag_no ?? ''
  const rows = milk.filter((m) => !animalId || m.animal_id === animalId).slice().reverse()

  const chart = useMemo(() => {
    const key = (m: Milk) => (period === 'day' ? m.entry_date : period === 'week' ? weekKey(m.entry_date) : m.entry_date.slice(0, 7))
    return Object.entries(groupBy(milk, key)).sort().map(([k, r]) => ({
      label: period === 'month' ? k : fmtDate(k).slice(0, 5),
      Morning: sum(r.filter((x) => x.shift === 'Morning'), (x) => x.litres),
      Evening: sum(r.filter((x) => x.shift === 'Evening'), (x) => x.litres),
    }))
  }, [milk, period])

  const perAnimal = useMemo(
    () => Object.entries(groupBy(milk, (m) => m.animal_id)).map(([id, r]) => ({ id, tag: tag(id), total: sum(r, (x) => x.litres), avg: sum(r, (x) => x.litres) / new Set(r.map((x) => x.entry_date)).size })).sort((a, b) => b.total - a.total),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [milk, animals],
  )
  const trend = useMemo(
    () => (animalId ? Object.entries(groupBy(milk.filter((m) => m.animal_id === animalId), (m) => m.entry_date)).sort().map(([d, r]) => ({ label: fmtDate(d).slice(0, 5), litres: sum(r, (x) => x.litres) })) : []),
    [milk, animalId],
  )

  const Prod = ({ title, list }: { title: string; list: typeof perAnimal }) => (
    <Card><h2 className="mb-2 font-bold">{title}</h2>
      {list.map((p) => <div key={p.id} className="flex justify-between border-b border-gray-100 py-1"><b>{p.tag}</b><span>{L(p.total)} L · {L(p.avg)}/day</span></div>)}
    </Card>
  )

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-brand-900">{t('milk.title')}</h1>
      <div className="flex gap-1">
        {(['day', 'week', 'month'] as const).map((p) => (
          <Button key={p} size="sm" variant={period === p ? 'primary' : 'outline'} onClick={() => setPeriod(p)}>{p}</Button>
        ))}
      </div>
      <Card>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Legend />
            <Bar dataKey="Morning" stackId="a" fill="#15803d" /><Bar dataKey="Evening" stackId="a" fill="#86efac" /></BarChart>
        </ResponsiveContainer>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Prod title={t('admin.topProducers')} list={perAnimal.slice(0, 5)} />
        <Prod title={t('admin.bottomProducers')} list={perAnimal.slice(-5).reverse()} />
      </div>
      {animalId && trend.length > 0 && (
        <Card><h2 className="mb-2 font-bold">{tag(animalId)}</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Line dataKey="litres" stroke="#15803d" strokeWidth={2} /></LineChart>
          </ResponsiveContainer>
        </Card>
      )}
      <DataTable
        rows={rows} exportName="milk-production" rowKey={(m) => m.id}
        toolbar={
          <>
            <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
            <Select className="!h-10 !w-40" value={animalId} onChange={(e) => setAnimalId(e.target.value)}><option value="">{t('all')}</option>{animals.map((a) => <option key={a.id} value={a.id}>{a.tag_no}</option>)}</Select>
          </>
        }
        cols={[
          { key: 'd', header: t('date'), value: (m) => fmtDate(m.entry_date) },
          { key: 's', header: t('shift'), value: (m) => m.shift },
          { key: 'a', header: t('milk.animal'), value: (m) => tag(m.animal_id) },
          { key: 'l', header: t('litres'), value: (m) => Number(m.litres), align: 'right' },
          { key: 'f', header: t('milk.fat'), value: (m) => m.fat ?? '', align: 'right' },
          { key: 'n', header: t('milk.snf'), value: (m) => m.snf ?? '', align: 'right' },
        ]}
        actions={(m) => (
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="outline" onClick={() => setEdit(m)}>{t('edit')}</Button>
            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => window.confirm(t('delete') + '?') && save('milk_production', 'delete', undefined, { id: m.id })}>{t('delete')}</Button>
          </div>
        )}
      />
      {edit && <EditMilk m={edit} onClose={() => setEdit(null)} />}
    </div>
  )
}
