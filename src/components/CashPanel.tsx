import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCash } from '@/lib/data'
import { useSave } from '@/lib/useSave'
import { useToast } from '@/components/Toast'
import { useAuth } from '@/lib/auth'
import { Button, Card, Field, Input } from '@/components/ui'
import DeleteButton from '@/components/DeleteButton'
import { addDays, fmtDate, inr, L, todayIST } from '@/lib/format'
import { groupBy, sum, uuid } from '@/lib/utils'

/** Daily cash collected from direct (walk-in) milk sales, and who it was handed to. */
export default function CashPanel() {
  const { t } = useTranslation()
  const { isAdmin, settings } = useAuth()
  const save = useSave()
  const toast = useToast()
  const today = todayIST()
  const [f, setF] = useState({ entry_date: today, amount: '', litres: '', handed_to: '', note: '' })
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }))
  const minDate = isAdmin ? undefined : addDays(today, -(settings?.manager_edit_days ?? 2))
  const { data: rows = [] } = useCash(addDays(today, -59), today)

  // Names used before, offered as suggestions in the "handed to" box
  const owners = useMemo(() => [...new Set(rows.map((r) => r.handed_to).filter(Boolean) as string[])], [rows])
  const todayTotal = sum(rows.filter((r) => r.entry_date === today), (r) => r.amount)
  const monthTotal = sum(rows.filter((r) => r.entry_date.startsWith(today.slice(0, 7))), (r) => r.amount)
  const byDay = Object.entries(groupBy(rows, (r) => r.entry_date)).sort((a, b) => b[0].localeCompare(a[0]))

  const submit = async () => {
    if (!(Number(f.amount) > 0)) return toast(t('cash.enterAmount'), 'err')
    const ok = await save('cash_collections', 'insert', {
      id: uuid(), entry_date: f.entry_date, amount: Number(f.amount), litres: f.litres ? Number(f.litres) : null,
      handed_to: f.handed_to.trim() || null, note: f.note.trim() || null,
    })
    if (ok) setF((s) => ({ ...s, amount: '', litres: '', note: '' }))
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Card className="!p-3"><div className="text-xs text-gray-600">{t('cash.today')}</div><div className="text-2xl font-extrabold text-brand-800">{inr(todayTotal)}</div></Card>
        <Card className="!p-3"><div className="text-xs text-gray-600">{t('cash.month')}</div><div className="text-2xl font-extrabold text-brand-800">{inr(monthTotal)}</div></Card>
      </div>

      <Card className="space-y-3">
        <Field label={t('cash.collected') + ' (₹)'}><Input big type="number" inputMode="decimal" value={f.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('date')}><Input type="date" value={f.entry_date} min={minDate} max={today} onChange={(e) => e.target.value && set('entry_date', e.target.value)} /></Field>
          <Field label={t('cash.litresSold')}><Input type="number" inputMode="decimal" step="0.5" value={f.litres} onChange={(e) => set('litres', e.target.value)} /></Field>
        </div>
        <Field label={t('cash.handedTo')}>
          <Input list="cash-owners" value={f.handed_to} onChange={(e) => set('handed_to', e.target.value)} placeholder={t('cash.ownerName')} />
          <datalist id="cash-owners">{owners.map((o) => <option key={o} value={o} />)}</datalist>
        </Field>
        {owners.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {owners.slice(0, 6).map((o) => <button key={o} type="button" onClick={() => set('handed_to', o)} className="rounded-full bg-brand-100 px-3 py-1.5 text-sm font-bold text-brand-900">{o}</button>)}
          </div>
        )}
        <Field label={t('notes')}><Input value={f.note} onChange={(e) => set('note', e.target.value)} /></Field>
        <Button size="lg" className="w-full" onClick={submit}>{t('save')} · {inr(f.amount)}</Button>
      </Card>

      <h2 className="text-lg font-extrabold text-brand-900">{t('cash.history')}</h2>
      {byDay.map(([d, list]) => (
        <Card key={d} className="!p-0">
          <div className="flex items-center justify-between rounded-t-2xl bg-brand-50 px-4 py-2">
            <b>{fmtDate(d)}</b><b className="text-brand-800">{inr(sum(list, (r) => r.amount))}</b>
          </div>
          {list.map((r) => (
            <div key={r.id} className="flex items-center justify-between border-t border-gray-100 px-4 py-2 text-sm">
              <div className="min-w-0">
                <div className="font-bold">{inr(r.amount)}{r.litres ? <span className="font-normal text-gray-600"> · {L(r.litres)} L</span> : null}</div>
                <div className="truncate text-xs text-gray-600">{r.handed_to ? `→ ${r.handed_to}` : t('cash.noOwner')}{r.note ? ` · ${r.note}` : ''}</div>
              </div>
              <DeleteButton table="cash_collections" id={r.id} date={r.entry_date} />
            </div>
          ))}
        </Card>
      ))}
      {!byDay.length && <div className="p-6 text-center text-gray-500">{t('noData')}</div>}
    </div>
  )
}
