import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCustomers } from '@/lib/data'
import { useSave } from '@/lib/useSave'
import { useToast } from '@/components/Toast'
import { Button, Field, Input, Modal, Select, Textarea } from '@/components/ui'
import { uuid } from '@/lib/utils'
import { toNum } from '@/lib/format'
import { CUSTOMER_TYPES, type Customer } from '@/lib/types'

export default function CustomerForm({ customer, defaultRate, onClose }: { customer?: Customer | null; defaultRate: number; onClose: () => void }) {
  const { t } = useTranslation()
  const save = useSave()
  const toast = useToast()
  useCustomers()
  const [f, setF] = useState({
    name: customer?.name ?? '', phone: customer?.phone ?? '', area: customer?.area ?? '', type: customer?.type ?? 'Home delivery',
    buys_cow: customer?.buys_cow ?? true, buys_buffalo: customer?.buys_buffalo ?? false,
    default_rate: String(customer?.default_rate ?? defaultRate), default_morning_litres: String(customer?.default_morning_litres ?? 0),
    default_evening_litres: String(customer?.default_evening_litres ?? 0),
    default_rate_buffalo: String(customer?.default_rate_buffalo ?? defaultRate),
    default_morning_litres_buffalo: String(customer?.default_morning_litres_buffalo ?? 0),
    default_evening_litres_buffalo: String(customer?.default_evening_litres_buffalo ?? 0),
    opening_balance: String(customer?.opening_balance ?? 0), active: customer?.active ?? true,
  })
  const set = (k: string, v: any) => setF((s) => ({ ...s, [k]: v }))

  const submit = async () => {
    if (!f.name.trim()) return toast('Name required', 'err')
    if (!f.buys_cow && !f.buys_buffalo) return toast(t('cust.pickType'), 'err')
    const ok = await save('customers', 'upsert', {
      id: customer?.id ?? uuid(), name: f.name.trim(), phone: f.phone || null, area: f.area || null, type: f.type,
      buys_cow: f.buys_cow, buys_buffalo: f.buys_buffalo,
      default_rate: toNum(f.default_rate) ?? 0, default_morning_litres: toNum(f.default_morning_litres) ?? 0,
      default_evening_litres: toNum(f.default_evening_litres) ?? 0,
      default_rate_buffalo: toNum(f.default_rate_buffalo) ?? 0, default_morning_litres_buffalo: toNum(f.default_morning_litres_buffalo) ?? 0,
      default_evening_litres_buffalo: toNum(f.default_evening_litres_buffalo) ?? 0,
      opening_balance: toNum(f.opening_balance) ?? 0, active: f.active,
    })
    if (ok) onClose()
  }

  // Managers and admins can delete. A customer that already has deliveries or payments is refused by the
  // database (foreign key); the toast then tells the user to mark the customer inactive instead.
  const remove = async () => {
    if (!customer || !window.confirm(`${t('cust.deleteCustomer')}\n${customer.name}`)) return
    const ok = await save('customers', 'delete', undefined, { id: customer.id })
    if (ok) onClose()
  }

  const rateFields = (suffix: '' | '_buffalo') => (
    <>
      <Field label={t('cust.defaultRate')} className="col-span-2"><Input type="number" inputMode="decimal" value={(f as any)['default_rate' + suffix]} onChange={(e) => set('default_rate' + suffix, e.target.value)} /></Field>
      <Field label={t('cust.morningL')}><Input type="number" inputMode="decimal" value={(f as any)['default_morning_litres' + suffix]} onChange={(e) => set('default_morning_litres' + suffix, e.target.value)} /></Field>
      <Field label={t('cust.eveningL')}><Input type="number" inputMode="decimal" value={(f as any)['default_evening_litres' + suffix]} onChange={(e) => set('default_evening_litres' + suffix, e.target.value)} /></Field>
    </>
  )

  return (
    <Modal open onClose={onClose} title={customer ? t('edit') : t('cust.addCustomer')}>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('name')} className="col-span-2"><Input value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label={t('phone')}><Input type="tel" inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label={t('area')}><Input value={f.area} onChange={(e) => set('area', e.target.value)} /></Field>
        <Field label={t('type')} className="col-span-2"><Select value={f.type} onChange={(e) => set('type', e.target.value)}>{CUSTOMER_TYPES.map((x) => <option key={x}>{x}</option>)}</Select></Field>

        <div className="col-span-2">
          <div className="mb-1 text-sm font-bold text-gray-700">{t('cust.milkType')}</div>
          <div className="grid grid-cols-2 gap-2">
            <label className={`flex h-14 items-center gap-2 rounded-xl border-2 px-3 text-base font-bold ${f.buys_cow ? 'border-brand-700 bg-brand-50' : 'border-gray-300'}`}>
              <input type="checkbox" className="h-6 w-6" checked={f.buys_cow} onChange={(e) => set('buys_cow', e.target.checked)} /> 🐄 {t('cust.cow')}
            </label>
            <label className={`flex h-14 items-center gap-2 rounded-xl border-2 px-3 text-base font-bold ${f.buys_buffalo ? 'border-brand-700 bg-brand-50' : 'border-gray-300'}`}>
              <input type="checkbox" className="h-6 w-6" checked={f.buys_buffalo} onChange={(e) => set('buys_buffalo', e.target.checked)} /> 🐃 {t('cust.buffalo')}
            </label>
          </div>
        </div>

        {f.buys_cow && <div className="col-span-2 -mb-1 text-sm font-extrabold text-brand-800">🐄 {t('cust.cowSection')}</div>}
        {f.buys_cow && rateFields('')}
        {f.buys_buffalo && <div className="col-span-2 -mb-1 text-sm font-extrabold text-brand-800">🐃 {t('cust.buffaloSection')}</div>}
        {f.buys_buffalo && rateFields('_buffalo')}

        <Field label={t('cust.opening')}><Input type="number" inputMode="decimal" value={f.opening_balance} onChange={(e) => set('opening_balance', e.target.value)} /></Field>
        <label className="flex items-end gap-2 pb-3 text-base font-bold"><input type="checkbox" className="h-6 w-6" checked={f.active} onChange={(e) => set('active', e.target.checked)} /> {t('cust.active')}</label>
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>{t('cancel')}</Button>
        <Button className="flex-1" onClick={submit}>{t('save')}</Button>
      </div>
      {customer && <Button variant="danger" className="mt-2 w-full" onClick={remove}>{t('delete')}</Button>}
    </Modal>
  )
}

export { Textarea }
