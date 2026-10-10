import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useExpenses } from '@/lib/data'
import { useSave } from '@/lib/useSave'
import { Button, Card, Select } from '@/components/ui'
import { DataTable, DateRange } from '@/components/DataTable'
import { addDays, fmtDate, inr, todayIST } from '@/lib/format'
import { groupBy, sum } from '@/lib/utils'
import { EXPENSE_CATS } from '@/lib/types'

export default function AdminExpenses() {
  const { t } = useTranslation()
  const save = useSave()
  const today = todayIST()
  const [from, setFrom] = useState(addDays(today, -89))
  const [to, setTo] = useState(today)
  const [cat, setCat] = useState('')
  const { data = [] } = useExpenses(from, to)
  const rows = data.filter((e) => !cat || e.category === cat)

  const monthly = useMemo(() => Object.entries(groupBy(data, (e) => e.entry_date.slice(0, 7))).sort().map(([k, r]) => ({ label: k, amount: sum(r, (e) => e.amount) })), [data])
  const suppliers = useMemo(() => Object.entries(groupBy(data.filter((e) => e.supplier), (e) => e.supplier!)).map(([k, r]) => ({ k, v: sum(r, (e) => e.amount) })).sort((a, b) => b.v - a.v).slice(0, 8), [data])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-brand-900">{t('nav.expenses')}</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><h2 className="mb-2 font-bold">{t('exp.monthly')}</h2>
          <ResponsiveContainer width="100%" height={220}><BarChart data={monthly}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={(v: number) => inr(v)} /><Bar dataKey="amount" fill="#f59e0b" /></BarChart></ResponsiveContainer></Card>
        <Card><h2 className="mb-2 font-bold">{t('exp.supplier')}</h2>
          {suppliers.map((s) => <div key={s.k} className="flex justify-between border-b border-gray-100 py-1"><span>{s.k}</span><b>{inr(s.v)}</b></div>)}
          {!suppliers.length && <div className="text-gray-500">{t('noData')}</div>}</Card>
      </div>
      <DataTable
        rows={rows} exportName="expenses" rowKey={(e) => e.id}
        toolbar={<><DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
          <Select className="!h-10 !w-40" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">{t('all')}</option>{EXPENSE_CATS.map((c) => <option key={c}>{c}</option>)}</Select>
          <span className="font-bold text-brand-800">{t('total')}: {inr(sum(rows, (e) => e.amount))}</span></>}
        cols={[
          { key: 'd', header: t('date'), value: (e) => fmtDate(e.entry_date) }, { key: 'c', header: t('exp.category'), value: (e) => e.category },
          { key: 'i', header: t('exp.item'), value: (e) => e.item_name }, { key: 'q', header: t('exp.qty'), value: (e) => (e.quantity ? `${e.quantity} ${e.unit}` : '') },
          { key: 'r', header: t('exp.rate'), value: (e) => e.rate ?? '', align: 'right' }, { key: 'a', header: t('amount'), value: (e) => Number(e.amount), align: 'right' },
          { key: 's', header: t('exp.supplier'), value: (e) => e.supplier }, { key: 'm', header: t('exp.payMode'), value: (e) => e.pay_mode },
          { key: 'b', header: t('exp.bill'), value: (e) => e.bill_url ?? '', render: (e) => (e.bill_url ? <a className="text-brand-700 underline" href={e.bill_url} target="_blank" rel="noreferrer">view</a> : null) },
        ]}
        actions={(e) => <Button size="sm" variant="ghost" className="text-red-600" onClick={() => window.confirm(t('delete') + '?') && save('expenses', 'delete', undefined, { id: e.id })}>{t('delete')}</Button>}
      />
    </div>
  )
}
