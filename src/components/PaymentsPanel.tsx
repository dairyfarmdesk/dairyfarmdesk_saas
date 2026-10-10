import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCustomers, usePayments } from '@/lib/data'
import { useSave } from '@/lib/useSave'
import { useToast } from '@/components/Toast'
import { useAuth } from '@/lib/auth'
import { Button, Card, Field, Input, Select } from '@/components/ui'
import DeleteButton from '@/components/DeleteButton'
import { addDays, fmtDate, inr, todayIST } from '@/lib/format'
import { uuid } from '@/lib/utils'
import { PAY_MODES } from '@/lib/types'

export default function PaymentsPanel() {
  const { t } = useTranslation()
  const { isAdmin, settings } = useAuth()
  const save = useSave()
  const toast = useToast()
  const today = todayIST()
  const { data: customers = [] } = useCustomers()
  const { data: pays = [] } = usePayments(addDays(today, -30), today)
  const [f, setF] = useState({ customer_id: '', entry_date: today, amount: '', mode: 'Cash', note: '' })
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }))
  const minDate = isAdmin ? undefined : addDays(today, -(settings?.manager_edit_days ?? 2))
  const name = (id: string) => customers.find((c) => c.id === id)?.name ?? ''

  const submit = async () => {
    if (!f.customer_id || !(Number(f.amount) > 0)) return toast('Select customer and amount', 'err')
    const ok = await save('customer_payments', 'insert', { id: uuid(), customer_id: f.customer_id, entry_date: f.entry_date, amount: Number(f.amount), mode: f.mode, note: f.note || null })
    if (ok) setF((s) => ({ ...s, amount: '', note: '' }))
  }

  return (
    <>
      <Card className="space-y-3">
        <Field label={t('nav.customers')}>
          <Select big value={f.customer_id} onChange={(e) => set('customer_id', e.target.value)}>
            <option value="">–</option>
            {customers.filter((c) => c.active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label={t('amount') + ' (₹)'}><Input big type="number" inputMode="decimal" value={f.amount} onChange={(e) => set('amount', e.target.value)} /></Field>
        <div className="grid grid-cols-3 gap-2">
          {PAY_MODES.map((m) => (
            <button key={m} type="button" onClick={() => set('mode', m)} className={`h-14 rounded-xl text-lg font-bold ${f.mode === m ? 'bg-brand-700 text-white' : 'bg-gray-200'}`}>{m}</button>
          ))}
        </div>
        <Field label={t('date')}><Input type="date" value={f.entry_date} min={minDate} max={today} onChange={(e) => set('entry_date', e.target.value)} /></Field>
        <Field label={t('notes')}><Input value={f.note} onChange={(e) => set('note', e.target.value)} /></Field>
        <Button size="lg" className="w-full" onClick={submit}>{t('cust.addPayment')}</Button>
      </Card>
      <Card className="divide-y divide-gray-100 !p-0">
        {pays.slice(0, 20).map((p) => (
          <div key={p.id} className="flex items-center justify-between px-4 py-2">
            <div><div className="font-bold">{name(p.customer_id)}</div><div className="text-xs text-gray-600">{fmtDate(p.entry_date)} · {p.mode}</div></div>
            <div className="flex items-center"><div className="text-lg font-extrabold text-brand-800">{inr(p.amount)}</div><DeleteButton table="customer_payments" id={p.id} date={p.entry_date} /></div>
          </div>
        ))}
        {!pays.length && <div className="p-4 text-center text-gray-500">{t('noData')}</div>}
      </Card>
    </>
  )
}
