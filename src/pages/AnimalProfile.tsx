import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { useAnimals, useMedical, useMilk, useWithdrawal } from '@/lib/data'
import { Badge, Card } from '@/components/ui'
import { addDays, fmtDate, todayIST, inr, L } from '@/lib/format'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useAuth } from '@/lib/auth'

export default function AnimalProfile() {
  const { id } = useParams()
  const { t } = useTranslation()
  const { isAdmin } = useAuth()
  const { data: animals = [] } = useAnimals()
  const { data: med = [] } = useMedical()
  const { data: wd = [] } = useWithdrawal()
  const today = todayIST()
  const { data: milk = [] } = useMilk(addDays(today, -30), today)
  const a = animals.find((x) => x.id === id)
  if (!a) return <div className="p-6 text-gray-500">{t('loading')}</div>

  const records = med.filter((m) => m.animal_id === a.id)
  const w = wd.find((x) => x.animal_id === a.id)
  const byDay: Record<string, number> = {}
  milk.filter((m) => m.animal_id === a.id).forEach((m) => (byDay[m.entry_date] = (byDay[m.entry_date] || 0) + Number(m.litres)))
  const series = Object.entries(byDay).sort().map(([d, v]) => ({ d: fmtDate(d).slice(0, 5), v }))

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <Link to={isAdmin && location.pathname.startsWith('/admin') ? '/admin/animals' : '/m/animals'} className="inline-flex items-center gap-1 font-bold text-brand-700"><ArrowLeft className="h-4 w-4" /> {t('back')}</Link>
      <Card className="flex gap-4">
        {a.photo_url ? <img src={a.photo_url} className="h-24 w-24 rounded-xl object-cover" alt="" /> : <div className="grid h-24 w-24 place-items-center rounded-xl bg-brand-100 text-4xl">🐄</div>}
        <div className="space-y-1">
          <div className="text-2xl font-extrabold">{a.tag_no} {a.name && `· ${a.name}`}</div>
          <div className="text-gray-700">{a.type} · {a.breed}</div>
          <div className="flex flex-wrap gap-1"><Badge tone={a.status === 'Lactating' ? 'green' : 'gray'}>{a.status}</Badge>{a.archived && <Badge tone="amber">{t('animal.archived')}</Badge>}</div>
          <div className="text-sm text-gray-600">{t('animal.dob')}: {fmtDate(a.dob) || '-'}</div>
          {isAdmin && <div className="text-sm text-gray-600">{t('animal.purchasePrice')}: {a.purchase_price ? inr(a.purchase_price) : '-'} · {a.source || ''}</div>}
        </div>
      </Card>
      {w && <div className="rounded-2xl bg-red-600 p-3 text-lg font-extrabold text-white">⚠ {t('milk.doNotSell')} ({fmtDate(w.until)})</div>}
      {series.length > 1 && (
        <Card>
          <div className="mb-2 font-bold">{t('milk.title')} (30d) – {L(series.reduce((s, x) => s + x.v, 0))} L</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={series}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="d" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Line dataKey="v" stroke="#15803d" strokeWidth={2} dot={false} /></LineChart>
          </ResponsiveContainer>
        </Card>
      )}
      <h2 className="text-xl font-extrabold text-brand-900">{t('health.timeline')}</h2>
      <div className="space-y-2 border-l-4 border-brand-300 pl-3">
        {records.map((m) => (
          <Card key={m.id}>
            <div className="flex items-center justify-between"><b>{m.type}</b><span className="text-sm text-gray-600">{fmtDate(m.entry_date)}</span></div>
            {m.symptoms && <div className="text-sm">{m.symptoms}</div>}
            {m.medicine && <div className="text-sm">💊 {m.medicine} {m.dose && `(${m.dose})`}</div>}
            <div className="mt-1 flex flex-wrap gap-1 text-xs">
              {m.vet_name && <Badge>{m.vet_name}</Badge>}
              {isAdmin && m.cost > 0 && <Badge>{inr(m.cost)}</Badge>}
              {m.withdrawal_days > 0 && <Badge tone="red">{t('health.withdrawalDays')}: {m.withdrawal_days}</Badge>}
              {m.next_due_date && <Badge tone="amber">{t('health.nextDue')}: {fmtDate(m.next_due_date)}</Badge>}
            </div>
          </Card>
        ))}
        {!records.length && <div className="text-gray-500">{t('noData')}</div>}
      </div>
    </div>
  )
}
