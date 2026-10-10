import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLabourPayments, useLabourers } from '@/lib/data'
import { useSave } from '@/lib/useSave'
import { useToast } from '@/components/Toast'
import { useAuth } from '@/lib/auth'
import { Badge, Button, Card, Field, Input, Modal, Select } from '@/components/ui'
import DeleteButton from '@/components/DeleteButton'
import { addDays, fmtDate, inr, toNum, todayIST } from '@/lib/format'
import { sum, uuid } from '@/lib/utils'
import { LABOUR_TYPES, PAY_MODES, type Labourer } from '@/lib/types'

/** Add / edit a worker (admin only). */
function WorkerForm({ w, onClose }: { w: Labourer | null; onClose: () => void }) {
  const { t } = useTranslation()
  const save = useSave()
  const toast = useToast()
  const [f, setF] = useState({ name: w?.name ?? '', phone: w?.phone ?? '', role: w?.role ?? '', monthly_salary: String(w?.monthly_salary ?? ''), join_date: w?.join_date ?? '', active: w?.active ?? true })
  const submit = async () => {
    if (!f.name.trim()) return toast(t('name'), 'err')
    const ok = await save('labourers', 'upsert', { id: w?.id ?? uuid(), name: f.name.trim(), phone: f.phone || null, role: f.role || null, monthly_salary: toNum(f.monthly_salary) ?? 0, join_date: f.join_date || null, active: f.active })
    if (ok) onClose()
  }
  // Workers with payment history can't be deleted (database refuses); mark them inactive instead.
  const remove = async () => {
    if (!w || !window.confirm(`${t('delete')} ${w.name}?`)) return
    if (await save('labourers', 'delete', undefined, { id: w.id })) onClose()
  }
  return (
    <Modal open onClose={onClose} title={w ? t('edit') : t('labour.addWorker')}>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('name')} className="col-span-2"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label={t('phone')}><Input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label={t('labour.role')}><Input value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} /></Field>
        <Field label={t('labour.salary') + ' ₹'}><Input type="number" inputMode="decimal" value={f.monthly_salary} onChange={(e) => setF({ ...f, monthly_salary: e.target.value })} /></Field>
        <Field label={t('labour.joined')}><Input type="date" value={f.join_date} onChange={(e) => setF({ ...f, join_date: e.target.value })} /></Field>
        <label className="col-span-2 flex items-center gap-2 font-bold"><input type="checkbox" className="h-6 w-6" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> {t('cust.active')}</label>
      </div>
      <div className="mt-4 flex gap-2"><Button variant="outline" className="flex-1" onClick={onClose}>{t('cancel')}</Button><Button className="flex-1" onClick={submit}>{t('save')}</Button></div>
      {w && <Button variant="danger" className="mt-2 w-full" onClick={remove}>{t('delete')}</Button>}
    </Modal>
  )
}

/** Record one payment: every time a worker asks for money, add a row here. */
function PayForm({ workers, preset }: { workers: Labourer[]; preset?: string }) {
  const { t } = useTranslation()
  const { isAdmin, settings } = useAuth()
  const save = useSave()
  const toast = useToast()
  const today = todayIST()
  const [f, setF] = useState({ labour_id: preset ?? '', entry_date: today, amount: '', pay_type: 'Advance', mode: 'Cash', note: '' })
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }))
  const minDate = isAdmin ? undefined : addDays(today, -(settings?.manager_edit_days ?? 2))
  const submit = async () => {
    if (!f.labour_id || !(Number(f.amount) > 0)) return toast(t('labour.pickWorker'), 'err')
    const ok = await save('labour_payments', 'insert', { id: uuid(), labour_id: f.labour_id, entry_date: f.entry_date, amount: Number(f.amount), pay_type: f.pay_type, mode: f.mode, note: f.note || null })
    if (ok) setF((s) => ({ ...s, amount: '', note: '' }))
  }
  return (
    <Card className="space-y-3">
      <Field label={t('labour.worker')}>
        <Select big value={f.labour_id} onChange={(e) => set('labour_id', e.target.value)}><option value="">–</option>{workers.filter((w) => w.active).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select>
      </Field>
      <Field label={t('amount') + ' (₹)'}><Input big type="number" inputMode="decimal" value={f.amount} onChange={(e) => set('amount', e.target.value)} /></Field>
      <div className="grid grid-cols-4 gap-1">
        {LABOUR_TYPES.map((x) => <button key={x} type="button" onClick={() => set('pay_type', x)} className={`h-12 rounded-xl text-sm font-bold ${f.pay_type === x ? 'bg-brand-700 text-white' : 'bg-gray-200'}`}>{x}</button>)}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t('date')}><Input type="date" value={f.entry_date} min={minDate} max={today} onChange={(e) => set('entry_date', e.target.value)} /></Field>
        <Field label={t('cust.mode')}><Select value={f.mode} onChange={(e) => set('mode', e.target.value)}>{PAY_MODES.map((m) => <option key={m}>{m}</option>)}</Select></Field>
      </div>
      <Field label={t('notes')}><Input value={f.note} onChange={(e) => set('note', e.target.value)} placeholder="e.g. medical, festival" /></Field>
      <Button size="lg" className="w-full" onClick={submit}>{t('save')} · {inr(f.amount)}</Button>
    </Card>
  )
}
/** Month summary for each worker + full payment history. */
export default function LabourPanel() {
  const { t } = useTranslation()
  const { isAdmin } = useAuth()
  const save = useSave()
  const today = todayIST()
  const [month, setMonth] = useState(today.slice(0, 7))
  const [open, setOpen] = useState<string | null>(null)
  const [edit, setEdit] = useState<Labourer | null | undefined>(undefined)
  const { data: workers = [] } = useLabourers()
  const { data: pays = [] } = useLabourPayments()

  const inMonth = (d: string) => d.startsWith(month)
  const monthPays = pays.filter((p) => inMonth(p.entry_date))

  return (
    <div className="space-y-3">
      <PayForm workers={workers} />

      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-lg font-extrabold text-brand-900">{t('labour.workers')}</h2>
        <Input type="month" className="!w-44" value={month} max={today.slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        <Button size="sm" onClick={() => setEdit(null)}>+ {t('add')}</Button>
      </div>

      <Card className="!p-3 text-center">
        <div className="text-xs text-gray-600">{t('labour.paidThisMonth')}</div>
        <div className="text-3xl font-extrabold text-brand-800">{inr(sum(monthPays, (p) => p.amount))}</div>
      </Card>

      {workers.map((w) => {
        const mine = pays.filter((p) => p.labour_id === w.id)
        const mineMonth = mine.filter((p) => inMonth(p.entry_date))
        const paid = sum(mineMonth, (p) => p.amount)
        const advances = sum(mineMonth.filter((p) => p.pay_type === 'Advance'), (p) => p.amount)
        const due = Number(w.monthly_salary) - paid
        return (
          <Card key={w.id} className={`!p-3 ${w.active ? '' : 'opacity-60'}`}>
            <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen(open === w.id ? null : w.id)}>
              <div>
                <div className="text-lg font-extrabold">{w.name} {!w.active && <Badge tone="gray">inactive</Badge>}</div>
                <div className="text-xs text-gray-600">{w.role}{w.role && ' · '}{t('labour.salary')} {inr(w.monthly_salary)}</div>
              </div>
              <div className="text-right">
                <div className="font-extrabold text-brand-800">{inr(paid)}</div>
                <div className={`text-xs font-bold ${due > 0 ? 'text-red-700' : 'text-green-700'}`}>{due > 0 ? `${t('labour.balance')} ${inr(due)}` : due < 0 ? `${t('labour.extra')} ${inr(-due)}` : t('labour.settled')}</div>
              </div>
            </button>
            {open === w.id && (
              <div className="mt-3 space-y-1 border-t border-gray-100 pt-2">
                <div className="flex justify-between text-sm"><span>{t('labour.advancesMonth')}</span><b>{inr(advances)}</b></div>
                <div className="flex justify-between text-sm"><span>{t('labour.totalEver')}</span><b>{inr(sum(mine, (p) => p.amount))}</b></div>
                <div className="pt-1 text-xs font-bold uppercase text-gray-500">{t('labour.history')}</div>
                {mine.map((p) => (
                  <div key={p.id} className="flex items-center justify-between border-b border-gray-50 py-1 text-sm">
                    <div><b>{fmtDate(p.entry_date)}</b> <Badge tone={p.pay_type === 'Advance' ? 'amber' : 'green'}>{p.pay_type}</Badge> <span className="text-xs text-gray-500">{p.mode}{p.note ? ` · ${p.note}` : ''}</span></div>
                    <div className="flex items-center gap-1"><b>{inr(p.amount)}</b>
                      <DeleteButton table="labour_payments" id={p.id} date={p.entry_date} />
                    </div>
                  </div>
                ))}
                {!mine.length && <div className="text-sm text-gray-500">{t('noData')}</div>}
                <Button size="sm" variant="outline" onClick={() => setEdit(w)}>{t('edit')}</Button>
              </div>
            )}
          </Card>
        )
      })}
      {!workers.length && <div className="p-6 text-center text-gray-500">{t('noData')}</div>}
      {edit !== undefined && <WorkerForm w={edit} onClose={() => setEdit(undefined)} />}
    </div>
  )
}
