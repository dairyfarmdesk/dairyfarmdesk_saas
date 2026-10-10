import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCustomers, useLedger, usePayments, useSales } from '@/lib/data'
import { useSave } from '@/lib/useSave'
import { Badge, Button, Segmented } from '@/components/ui'
import { DataTable, DateRange } from '@/components/DataTable'
import CustomerForm from '@/components/CustomerForm'
import LedgerPanel from '@/components/LedgerPanel'
import PaymentsPanel from '@/components/PaymentsPanel'
import { useAuth } from '@/lib/auth'
import { addDays, fmtDate, inr, todayIST } from '@/lib/format'
import type { Customer } from '@/lib/types'

type Tab = 'customers' | 'sales' | 'payments' | 'ledger' | 'bill'

export default function AdminSales() {
  const { t } = useTranslation()
  const { settings } = useAuth()
  const save = useSave()
  const today = todayIST()
  const [tab, setTab] = useState<Tab>('customers')
  const [from, setFrom] = useState(addDays(today, -29))
  const [to, setTo] = useState(today)
  const [edit, setEdit] = useState<Customer | null | undefined>(undefined)
  const { data: customers = [] } = useCustomers()
  const { data: ledger = [] } = useLedger()
  const { data: sales = [] } = useSales(from, to)
  const { data: pays = [] } = usePayments(from, to)
  const cname = (id: string) => customers.find((c) => c.id === id)?.name ?? ''
  const range = <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-brand-900">{t('nav.sales')}</h1>
      <Segmented<Tab> value={tab} onChange={setTab} options={[
        { v: 'customers', label: t('cust.title') }, { v: 'sales', label: t('cust.deliveries') }, { v: 'payments', label: t('cust.payments') },
        { v: 'ledger', label: t('cust.outstanding') }, { v: 'bill', label: t('cust.bill') },
      ]} />

      {tab === 'customers' && (
        <>
          <Button onClick={() => setEdit(null)}>+ {t('cust.addCustomer')}</Button>
          <DataTable rows={customers} exportName="customers" rowKey={(c) => c.id} cols={[
            { key: 'n', header: t('name'), value: (c) => c.name }, { key: 'p', header: t('phone'), value: (c) => c.phone },
            { key: 'a', header: t('area'), value: (c) => c.area }, { key: 't', header: t('type'), value: (c) => c.type },
            { key: 'mt', header: t('cust.milkType'), value: (c) => [c.buys_cow && t('cust.cow'), c.buys_buffalo && t('cust.buffalo')].filter(Boolean).join(' + ') },
            { key: 'r', header: t('cust.rate'), value: (c) => Number(c.default_rate), align: 'right' },
            { key: 'rb', header: t('cust.buffalo') + ' ' + t('cust.rate'), value: (c) => (c.buys_buffalo ? Number(c.default_rate_buffalo) : ''), align: 'right' },
            { key: 'm', header: t('cust.morningL'), value: (c) => Number(c.default_morning_litres), align: 'right' },
            { key: 'e', header: t('cust.eveningL'), value: (c) => Number(c.default_evening_litres), align: 'right' },
            { key: 'ac', header: t('status'), value: (c) => (c.active ? 'Active' : 'Inactive'), render: (c) => <Badge tone={c.active ? 'green' : 'gray'}>{c.active ? t('cust.active') : 'Inactive'}</Badge> },
          ]} actions={(c) => <Button size="sm" variant="outline" onClick={() => setEdit(c)}>{t('edit')}</Button>} />
        </>
      )}

      {tab === 'sales' && (
        <DataTable rows={sales.slice().reverse()} exportName="milk-sales" rowKey={(s) => s.id} toolbar={range} cols={[
          { key: 'd', header: t('date'), value: (s) => fmtDate(s.entry_date) }, { key: 'c', header: t('nav.customers'), value: (s) => cname(s.customer_id) },
          { key: 's', header: t('shift'), value: (s) => s.shift }, { key: 'mt', header: t('cust.milkType'), value: (s) => (s.milk_type === 'Buffalo' ? t('cust.buffalo') : t('cust.cow')) },
          { key: 'l', header: t('litres'), value: (s) => Number(s.litres), align: 'right' },
          { key: 'r', header: t('cust.rate'), value: (s) => Number(s.rate), align: 'right' }, { key: 'a', header: t('amount'), value: (s) => Number(s.amount), align: 'right' },
        ]} actions={(s) => (
          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => window.confirm(t('delete') + '?') && save('milk_sales', 'delete', undefined, { id: s.id })}>{t('delete')}</Button>
        )} />
      )}

      {tab === 'payments' && (
        <>
          <details className="rounded-2xl border bg-white p-3"><summary className="cursor-pointer font-bold">+ {t('cust.addPayment')}</summary><div className="mt-3 max-w-md"><PaymentsPanel /></div></details>
          <DataTable rows={pays} exportName="payments" rowKey={(p) => p.id} toolbar={range} cols={[
            { key: 'd', header: t('date'), value: (p) => fmtDate(p.entry_date) }, { key: 'c', header: t('nav.customers'), value: (p) => cname(p.customer_id) },
            { key: 'a', header: t('amount'), value: (p) => Number(p.amount), align: 'right' }, { key: 'm', header: t('cust.mode'), value: (p) => p.mode }, { key: 'n', header: t('notes'), value: (p) => p.note },
          ]} actions={(p) => (
            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => window.confirm(t('delete') + '?') && save('customer_payments', 'delete', undefined, { id: p.id })}>{t('delete')}</Button>
          )} />
        </>
      )}

      {tab === 'ledger' && (
        <DataTable rows={ledger} exportName="customer-ledger" rowKey={(l) => l.customer_id} cols={[
          { key: 'n', header: t('name'), value: (l) => l.name }, { key: 'p', header: t('phone'), value: (l) => l.phone },
          { key: 'o', header: t('cust.opening'), value: (l) => Number(l.opening), render: (l) => inr(l.opening), align: 'right' },
          { key: 's', header: t('cust.supplied'), value: (l) => Number(l.supplied), render: (l) => inr(l.supplied), align: 'right' },
          { key: 'pd', header: t('cust.paid'), value: (l) => Number(l.paid), render: (l) => inr(l.paid), align: 'right' },
          { key: 'ou', header: t('cust.outstanding'), value: (l) => Number(l.outstanding), render: (l) => <b className={Number(l.outstanding) > 0 ? 'text-red-700' : ''}>{inr(l.outstanding)}</b>, align: 'right' },
        ]} />
      )}

      {tab === 'bill' && <div className="max-w-2xl"><LedgerPanel /></div>}
      {edit !== undefined && <CustomerForm customer={edit} defaultRate={settings?.default_rate ?? 55} onClose={() => setEdit(undefined)} />}
    </div>
  )
}
