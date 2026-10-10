import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAnimals, useExpenses, useMedical, useMilk, useSales, useWithdrawal } from '@/lib/data'
import { Badge, Card } from '@/components/ui'
import { addDays, diffDays, fmtDate, inr, L, todayIST } from '@/lib/format'
import { sum } from '@/lib/utils'

const Big = ({ to, emoji, label }: { to: string; emoji: string; label: string }) => (
  <Link to={to} className="flex h-28 flex-col items-center justify-center gap-1 rounded-2xl bg-brand-700 text-white shadow active:scale-[0.98]">
    <span className="text-4xl">{emoji}</span>
    <span className="text-lg font-extrabold">{label}</span>
  </Link>
)

export default function Home() {
  const { t } = useTranslation()
  const today = todayIST()
  const { data: milk = [] } = useMilk(today, today)
  const { data: sales = [] } = useSales(today, today)
  const { data: exp = [] } = useExpenses(today, today)
  const { data: med = [] } = useMedical()
  const { data: wd = [] } = useWithdrawal()
  const { data: animals = [] } = useAnimals()

  const morning = sum(milk.filter((m) => m.shift === 'Morning'), (m) => m.litres)
  const evening = sum(milk.filter((m) => m.shift === 'Evening'), (m) => m.litres)
  const sold = sum(sales, (s) => s.litres)
  const spent = sum(exp, (e) => e.amount)
  const due = med
    .filter((m) => m.next_due_date && m.next_due_date <= addDays(today, 7))
    .sort((a, b) => (a.next_due_date! < b.next_due_date! ? -1 : 1))
  const tag = (id: string) => animals.find((a) => a.id === id)?.tag_no ?? ''
  const alertCount = due.length + wd.length

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Card className="col-span-2 !bg-brand-700 text-white">
          <div className="text-sm opacity-90">{t('home.totalMilk')} · {fmtDate(today)}</div>
          <div className="text-5xl font-extrabold">{L(morning + evening)} <span className="text-xl">L</span></div>
          <div className="mt-1 flex gap-4 text-base font-semibold">
            <span>☀ {t('morning')}: {L(morning)}</span>
            <span>🌙 {t('evening')}: {L(evening)}</span>
          </div>
        </Card>
        <Card><div className="text-sm text-gray-600">{t('home.sold')}</div><div className="text-3xl font-extrabold text-brand-800">{L(sold)} L</div></Card>
        <Card><div className="text-sm text-gray-600">{t('home.expenses')}</div><div className="text-3xl font-extrabold text-brand-800">{inr(spent)}</div></Card>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Big to="/m/milk" emoji="🥛" label={t('home.addMilk')} />
        <Big to="/m/customers" emoji="🚚" label={t('home.addDelivery')} />
        <Big to="/m/expenses" emoji="🌾" label={t('home.addExpense')} />
        <Big to="/m/health" emoji="💉" label={t('home.addHealth')} />
        <Big to="/m/animals" emoji="🐄" label={t('animal.title')} />
        <Big to="/m/labour" emoji="👷" label={t('nav.labour')} />
        <Big to="/m/cash" emoji="💵" label={t('nav.cash')} />
        <Big to="/m/customers?tab=pay" emoji="💰" label={t('home.addPayment')} />
      </div>

      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-brand-900">🔔 {t('home.alerts')}</h2>
          {alertCount > 0 && <Badge tone="red">{alertCount}</Badge>}
        </div>
        {wd.map((w) => (
          <Link key={w.animal_id + w.until} to={`/m/animals/${w.animal_id}`} className="block rounded-xl bg-red-50 p-2 text-red-800">
            <b>{w.tag_no}</b> – {t('milk.doNotSell')} ({t('home.withdrawal')} → {fmtDate(w.until)})
          </Link>
        ))}
        {due.map((m) => {
          const late = diffDays(today, m.next_due_date!) < 0
          return (
            <Link key={m.id} to={`/m/animals/${m.animal_id}`} className={`block rounded-xl p-2 ${late ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900'}`}>
              <b>{tag(m.animal_id)}</b> – {m.type}: {t('home.followUp')} {fmtDate(m.next_due_date)}
            </Link>
          )
        })}
        {!alertCount && <div className="text-gray-500">{t('home.noAlerts')}</div>}
      </Card>
    </div>
  )
}
