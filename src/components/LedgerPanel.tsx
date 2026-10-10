import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCustomers, useLedger, useMilk, usePayments, useSales } from '@/lib/data'
import { useAuth } from '@/lib/auth'
import { Button, Card, Field, Input, Select } from '@/components/ui'
import { billPDF } from '@/lib/export'
import { addDays, fmtDate, inr, L, monthEnd, monthStart, todayIST } from '@/lib/format'
import { groupBy, sum } from '@/lib/utils'

export default function LedgerPanel() {
  const { t } = useTranslation()
  const { settings } = useAuth()
  const today = todayIST()
  const [month, setMonth] = useState(today.slice(0, 7))
  const [cid, setCid] = useState('')
  const from = month + '-01'
  const to = monthEnd(from)
  const { data: customers = [] } = useCustomers()
  const { data: ledger = [] } = useLedger()
  const { data: sales = [] } = useSales(from, to)
  const { data: pays = [] } = usePayments(from, to)
  const { data: milk = [] } = useMilk(addDays(today, -6), today)
  const { data: recentSales = [] } = useSales(addDays(today, -6), today)

  const c = customers.find((x) => x.id === cid)
  const mySales = sales.filter((s) => s.customer_id === cid).sort((a, b) => (a.entry_date + a.shift).localeCompare(b.entry_date + b.shift))
  const myPaid = sum(pays.filter((p) => p.customer_id === cid), (p) => p.amount)
  const totalL = sum(mySales, (s) => s.litres)
  const total = sum(mySales, (s) => s.amount)
  const lg = ledger.find((l) => l.customer_id === cid)
  // Monthly bill balance = opening balance carried to the month start + this month's milk - this month's payments
  const balance = lg ? Number(lg.outstanding) : 0

  const waText = () => {
    if (!c) return ''
    const byDate = groupBy(mySales, (s) => s.entry_date)
    // One line per day; when a customer buys both milks the day shows cow and buffalo litres separately
    const both = new Set(mySales.map((s) => s.milk_type ?? 'Cow')).size > 1
    const lines = Object.keys(byDate).sort().map((d) => {
      const rows = byDate[d]
      if (!both) return `${fmtDate(d)}: ${L(sum(rows, (s) => s.litres))} L`
      const cow = sum(rows.filter((s) => (s.milk_type ?? 'Cow') === 'Cow'), (s) => s.litres)
      const buf = sum(rows.filter((s) => s.milk_type === 'Buffalo'), (s) => s.litres)
      return `${fmtDate(d)}: Cow ${L(cow)} L, Buffalo ${L(buf)} L`
    })
    const rateLine = (type: 'Cow' | 'Buffalo') => {
      const r = [...new Set(mySales.filter((s) => (s.milk_type ?? 'Cow') === type).map((s) => s.rate))].join('/')
      return r ? `${type} rate: ₹${r}/L` : ''
    }
    const totals = both
      ? ['Cow', 'Buffalo'].map((ty) => `${ty} litres: ${L(sum(mySales.filter((s) => (s.milk_type ?? 'Cow') === ty), (s) => s.litres))}`)
      : []
    return [
      `*${settings?.farm_name || 'DairyFarmDesk'}*`, `Milk bill – ${month.split('-').reverse().join('-')}`, `Customer: ${c.name}`, '',
      ...lines, '', ...totals, `Total litres: ${L(totalL)}`, rateLine('Cow'), rateLine('Buffalo'), `Total amount: ${inr(total)}`, `Paid: ${inr(myPaid)}`, `*Balance due: ${inr(balance)}*`,
    ].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n')
  }
  const share = () => {
    const phone = (c?.phone || '').replace(/\D/g, '')
    const num = phone.length === 10 ? '91' + phone : phone
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(waText())}`, '_blank')
  }
  const pdf = () => {
    if (!c) return
    billPDF({
      farm: settings?.farm_name || 'DairyFarmDesk', customer: c.name, month: month.split('-').reverse().join('-'), rate: '',
      lines: mySales.map((s) => [fmtDate(s.entry_date), `${s.shift} · ${s.milk_type ?? 'Cow'}`, L(s.litres), String(s.rate), String(s.amount)]),
      totalL, total, paid: myPaid, balance,
    })
  }

  // Stock check (last 7 days): produced vs sold
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, -i))

  return (
    <>
      <Card className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('nav.customers')}>
            <Select value={cid} onChange={(e) => setCid(e.target.value)}><option value="">–</option>{customers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>
          </Field>
          <Field label={t('month')}><Input type="month" value={month} max={today.slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} /></Field>
        </div>
        {c && lg && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>{t('cust.opening')}: <b>{inr(lg.opening)}</b></div>
            <div>{t('cust.supplied')} (all): <b>{inr(lg.supplied)}</b></div>
            <div>{t('cust.paid')} (all): <b>{inr(lg.paid)}</b></div>
            <div className="text-red-700">{t('cust.outstanding')}: <b>{inr(lg.outstanding)}</b></div>
            <div className="col-span-2 mt-1 rounded-lg bg-brand-50 p-2">
              {month}: {L(totalL)} L · {inr(total)} · {t('cust.paid')} {inr(myPaid)}
            </div>
            <Button variant="outline" onClick={pdf}>📄 PDF</Button>
            <Button onClick={share}>💬 {t('cust.whatsapp')}</Button>
          </div>
        )}
      </Card>

      <h2 className="text-lg font-extrabold text-brand-900">{t('cust.outstanding')}</h2>
      <Card className="divide-y divide-gray-100 !p-0">
        {ledger.filter((l) => Number(l.outstanding) !== 0).sort((a, b) => b.outstanding - a.outstanding).map((l) => (
          <button key={l.customer_id} onClick={() => setCid(l.customer_id)} className="flex w-full items-center justify-between px-4 py-3 text-left">
            <span className="font-bold">{l.name}</span>
            <span className="font-extrabold text-red-700">{inr(l.outstanding)}</span>
          </button>
        ))}
      </Card>

      <h2 className="text-lg font-extrabold text-brand-900">{t('cust.stock')} (7d)</h2>
      <Card className="overflow-x-auto !p-0">
        <table className="w-full text-sm">
          <thead className="bg-brand-50"><tr><th className="p-2 text-left">{t('date')}</th><th className="p-2 text-right">{t('cust.produced')}</th><th className="p-2 text-right">{t('home.sold')}</th><th className="p-2 text-right">{t('cust.difference')}</th></tr></thead>
          <tbody>
            {days.map((d) => {
              const p = sum(milk.filter((m) => m.entry_date === d), (m) => m.litres)
              const s = sum(recentSales.filter((m) => m.entry_date === d), (m) => m.litres)
              return (
                <tr key={d} className="border-t border-gray-100">
                  <td className="p-2">{fmtDate(d)}</td><td className="p-2 text-right">{L(p)}</td><td className="p-2 text-right">{L(s)}</td>
                  <td className={`p-2 text-right font-bold ${p - s < 0 ? 'text-red-700' : ''}`}>{L(p - s)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </>
  )
}
