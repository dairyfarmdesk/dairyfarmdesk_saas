import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCustomers, useSales } from '@/lib/data'
import { useSave } from '@/lib/useSave'
import { useAuth } from '@/lib/auth'
import { Button, Card, Field, Input, Segmented } from '@/components/ui'
import { currentShift, fmtDate, inr, L, todayIST, addDays } from '@/lib/format'
import { sum, uuid } from '@/lib/utils'
import type { Customer, MilkType, Shift } from '@/lib/types'
import PaymentsPanel from '@/components/PaymentsPanel'
import LedgerPanel from '@/components/LedgerPanel'
import CustomerForm from '@/components/CustomerForm'

type Tab = 'del' | 'pay' | 'ledger'

export default function CustomersPage() {
  const { t } = useTranslation()
  const [sp] = useSearchParams()
  const [tab, setTab] = useState<Tab>((sp.get('tab') as Tab) || 'del')
  return (
    <div className="space-y-3">
      <Segmented<Tab> value={tab} onChange={setTab} options={[{ v: 'del', label: t('cust.deliveries') }, { v: 'pay', label: t('cust.payments') }, { v: 'ledger', label: t('cust.ledger') }]} />
      {tab === 'del' && <Deliveries />}
      {tab === 'pay' && <PaymentsPanel />}
      {tab === 'ledger' && <LedgerPanel />}
    </div>
  )
}

function Deliveries() {
  const { t } = useTranslation()
  const { isAdmin, settings } = useAuth()
  const save = useSave()
  const today = todayIST()
  const [date, setDate] = useState(today)
  const [shift, setShift] = useState<Shift>(currentShift())
  const { data: customers = [] } = useCustomers()
  const { data: sales = [] } = useSales(date, date)
  const active = customers.filter((c) => c.active)
  // One entry row per customer and milk type they buy (cow, buffalo or both)
  const rows = active.flatMap((c) => [
    ...(c.buys_cow ? [{ c, type: 'Cow' as MilkType }] : []),
    ...(c.buys_buffalo ? [{ c, type: 'Buffalo' as MilkType }] : []),
  ])
  const keyOf = (id: string, type: MilkType) => `${id}:${type}`
  const defOf = (c: Customer, type: MilkType) =>
    type === 'Cow'
      ? { l: shiftDefault(c.default_morning_litres, c.default_evening_litres), r: c.default_rate }
      : { l: shiftDefault(c.default_morning_litres_buffalo, c.default_evening_litres_buffalo), r: c.default_rate_buffalo }
  const [litres, setLitres] = useState<Record<string, string>>({})
  const [rates, setRates] = useState<Record<string, string>>({})
  const [addNew, setAddNew] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [busy, setBusy] = useState(false)
  const minDate = isAdmin ? undefined : addDays(today, -(settings?.manager_edit_days ?? 2))

  function shiftDefault(morning: number, evening: number) {
    return shift === 'Morning' ? morning : evening
  }

  // Pre-fill: saved sale if it exists, otherwise the customer's default quantity for the shift and milk type.
  useEffect(() => {
    const l: Record<string, string> = {}
    const r: Record<string, string> = {}
    for (const { c, type } of rows) {
      const k = keyOf(c.id, type)
      const s = sales.find((x) => x.customer_id === c.id && x.shift === shift && (x.milk_type ?? 'Cow') === type)
      const def = defOf(c, type)
      l[k] = s ? String(s.litres) : def.l ? String(def.l) : ''
      r[k] = String(s ? s.rate : def.r)
    }
    setLitres(l)
    setRates(r)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, shift, sales.length, customers.length])

  const total = sum(rows, ({ c, type }) => Number(litres[keyOf(c.id, type)]) || 0)
  const amount = sum(rows, ({ c, type }) => (Number(litres[keyOf(c.id, type)]) || 0) * (Number(rates[keyOf(c.id, type)]) || 0))
  const filled = rows.filter(({ c, type }) => litres[keyOf(c.id, type)] !== '' && litres[keyOf(c.id, type)] != null)

  const saveAll = async () => {
    setBusy(true)
    const payload = filled.map(({ c, type }) => ({
      id: sales.find((x) => x.customer_id === c.id && x.shift === shift && (x.milk_type ?? 'Cow') === type)?.id ?? uuid(),
      customer_id: c.id, entry_date: date, shift, milk_type: type,
      litres: Number(litres[keyOf(c.id, type)]) || 0, rate: Number(rates[keyOf(c.id, type)]) || 0,
    }))
    if (payload.length) await save('milk_sales', 'upsert', payload, { onConflict: 'customer_id,entry_date,shift,milk_type' })
    setBusy(false)
  }

  return (
    <>
      <Card className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('date')}><Input big type="date" value={date} min={minDate} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} /></Field>
          <Field label={fmtDate(date)}><Segmented value={shift} onChange={setShift} options={[{ v: 'Morning', label: '☀ ' + t('morning') }, { v: 'Evening', label: '🌙 ' + t('evening') }]} /></Field>
        </div>
      </Card>
      <div className="grid gap-3 lg:grid-cols-2">
      {active.map((c) => (
        <Card key={c.id} className="space-y-2 !p-3">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-lg font-extrabold">{c.name}</div>
              {c.area && <div className="text-xs text-gray-600">{c.area}</div>}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditCustomer(c)}>{t('edit')}</Button>
          </div>
          {rows.filter((r) => r.c.id === c.id).map(({ type }) => {
            const k = keyOf(c.id, type)
            const absent = Number(litres[k]) === 0 && litres[k] !== ''
            return (
              <div key={k} className={`flex items-center gap-2 rounded-xl p-2 ${absent ? 'bg-gray-100' : 'bg-brand-50'}`}>
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{type === 'Cow' ? '🐄 ' + t('cust.cow') : '🐃 ' + t('cust.buffalo')}</div>
                  <div className="text-xs text-gray-600">₹
                    <input
                      type="number" inputMode="decimal" className="mx-1 w-14 rounded border border-gray-300 px-1 text-center"
                      value={rates[k] ?? ''} onChange={(e) => setRates((s) => ({ ...s, [k]: e.target.value }))}
                    />/L = {inr((Number(litres[k]) || 0) * (Number(rates[k]) || 0))}
                  </div>
                </div>
                <Button variant="outline" className="!h-14 !w-14 !px-0 text-2xl" onClick={() => setLitres((s) => ({ ...s, [k]: '0' }))} aria-label={t('cust.absent')}>✕</Button>
                <Input big type="number" inputMode="decimal" step="0.5" min="0" className="!w-24 text-center" placeholder="0" value={litres[k] ?? ''} onChange={(e) => setLitres((s) => ({ ...s, [k]: e.target.value }))} />
              </div>
            )
          })}
        </Card>
      ))}
      </div>
      <Button variant="outline" className="w-full" onClick={() => setAddNew(true)}>+ {t('cust.addCustomer')}</Button>
      <div className="sticky bottom-24 z-10 md:bottom-4">
        <Button size="lg" className="w-full shadow-xl" disabled={busy || !filled.length} onClick={saveAll}>
          {t('milk.saveAll')} · {L(total)} L · {inr(amount)}
        </Button>
      </div>
      {addNew && <CustomerForm defaultRate={settings?.default_rate ?? 55} onClose={() => setAddNew(false)} />}
      {editCustomer && <CustomerForm customer={editCustomer} defaultRate={settings?.default_rate ?? 55} onClose={() => setEditCustomer(null)} />}
    </>
  )
}
