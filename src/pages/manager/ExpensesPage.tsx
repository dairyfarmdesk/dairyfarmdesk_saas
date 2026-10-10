import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSave } from '@/lib/useSave'
import { useToast } from '@/components/Toast'
import { useAuth } from '@/lib/auth'
import { Button, Card, Field, Input, Select, Textarea } from '@/components/ui'
import { addDays, inr, round2, todayIST } from '@/lib/format'
import { uuid } from '@/lib/utils'
import { uploadFile } from '@/lib/supabase'
import { EXPENSE_CATS, FEED_ITEMS, PAY_MODES, UNITS } from '@/lib/types'
import ExpenseSummary from '@/components/ExpenseSummary'

export default function ExpensesPage() {
  const { t } = useTranslation()
  const { isAdmin, settings } = useAuth()
  const save = useSave()
  const toast = useToast()
  const today = todayIST()
  const [f, setF] = useState({ entry_date: today, category: 'Feed', item_name: '', quantity: '', unit: 'kg', rate: '', amount: '', supplier: '', pay_mode: 'Cash', notes: '', bill_url: '' })
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }))
  const minDate = isAdmin ? undefined : addDays(today, -(settings?.manager_edit_days ?? 2))

  // quantity x rate auto-fills the amount; the amount can still be typed directly
  const onQR = (k: 'quantity' | 'rate', v: string) =>
    setF((s) => {
      const n = { ...s, [k]: v }
      return n.quantity && n.rate ? { ...n, amount: String(round2(Number(n.quantity) * Number(n.rate))) } : n
    })

  const submit = async () => {
    if (!f.item_name.trim() || f.amount === '' || !(Number(f.amount) >= 0)) return toast('Item and amount required', 'err')
    const ok = await save('expenses', 'insert', {
      id: uuid(), entry_date: f.entry_date, category: f.category, item_name: f.item_name.trim(),
      quantity: f.quantity ? Number(f.quantity) : null, unit: f.quantity ? f.unit : null, rate: f.rate ? Number(f.rate) : null,
      amount: Number(f.amount), supplier: f.supplier || null, pay_mode: f.pay_mode, bill_url: f.bill_url || null, notes: f.notes || null,
    })
    if (ok) setF((s) => ({ ...s, item_name: '', quantity: '', rate: '', amount: '', supplier: '', notes: '', bill_url: '' }))
  }

  const onBill = async (file?: File) => {
    if (!file) return
    try { set('bill_url', await uploadFile('bills', file)) } catch (e: any) { toast(e.message || 'Upload failed (needs internet)', 'err') }
  }

  return (
    <div className="space-y-3">
      <Card className="space-y-3">
        <Field label={t('exp.item')}>
          <Input big list="feed-items" value={f.item_name} onChange={(e) => set('item_name', e.target.value)} placeholder="Green fodder…" />
          <datalist id="feed-items">{FEED_ITEMS.map((x) => <option key={x} value={x} />)}</datalist>
        </Field>
        <div className="flex flex-wrap gap-1">
          {FEED_ITEMS.slice(0, 6).map((x) => <button key={x} type="button" onClick={() => set('item_name', x)} className="rounded-full bg-brand-100 px-3 py-1.5 text-sm font-bold text-brand-900">{x}</button>)}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('exp.category')}><Select value={f.category} onChange={(e) => set('category', e.target.value)}>{EXPENSE_CATS.map((x) => <option key={x}>{x}</option>)}</Select></Field>
          <Field label={t('date')}><Input type="date" value={f.entry_date} min={minDate} max={today} onChange={(e) => set('entry_date', e.target.value)} /></Field>
          <Field label={t('exp.qty')}><Input type="number" inputMode="decimal" value={f.quantity} onChange={(e) => onQR('quantity', e.target.value)} /></Field>
          <Field label={t('exp.unit')}><Select value={f.unit} onChange={(e) => set('unit', e.target.value)}>{UNITS.map((x) => <option key={x}>{x}</option>)}</Select></Field>
          <Field label={t('exp.rate') + ' ₹'}><Input type="number" inputMode="decimal" value={f.rate} onChange={(e) => onQR('rate', e.target.value)} /></Field>
          <Field label={t('amount') + ' ₹'}><Input big type="number" inputMode="decimal" value={f.amount} onChange={(e) => set('amount', e.target.value)} /></Field>
          <Field label={t('exp.supplier')}><Input value={f.supplier} onChange={(e) => set('supplier', e.target.value)} /></Field>
          <Field label={t('exp.payMode')}><Select value={f.pay_mode} onChange={(e) => set('pay_mode', e.target.value)}>{PAY_MODES.map((x) => <option key={x}>{x}</option>)}</Select></Field>
        </div>
        <Field label={t('exp.bill')}><input type="file" accept="image/*" capture="environment" onChange={(e) => onBill(e.target.files?.[0])} />{f.bill_url && <span className="text-sm text-green-700"> ✔</span>}</Field>
        <Field label={t('notes')}><Textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
        <Button size="lg" className="w-full" onClick={submit}>{t('save')} · {inr(f.amount)}</Button>
      </Card>
      <ExpenseSummary />
    </div>
  )
}
