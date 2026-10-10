import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '@/lib/supabase'
import { useAnimals, useExpenses, useLedger, useMedical, useWithdrawal } from '@/lib/data'
import { Badge, Card } from '@/components/ui'
import { addDays, fmtDate, inr, L, monthEnd, monthStart, todayIST } from '@/lib/format'
import { groupBy, sum } from '@/lib/utils'

const COLORS = ['#15803d', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#64748b']

const Kpi = ({ label, value, tone }: { label: string; value: string; tone?: string }) => (
  <Card><div className="text-xs font-semibold uppercase text-gray-500">{label}</div><div className={`text-2xl font-extrabold ${tone || 'text-brand-800'}`}>{value}</div></Card>
)

export default function Dashboard() {
  const { t } = useTranslation()
  const today = todayIST()
  const ms = monthStart(today)
  const me = monthEnd(today)

  const month = useQuery({ queryKey: ['sum', ms, me], queryFn: async () => (await supabase.rpc('admin_summary', { from_d: ms, to_d: me })).data?.[0] })
  const day = useQuery({ queryKey: ['sum', today, today], queryFn: async () => (await supabase.rpc('admin_summary', { from_d: today, to_d: today })).data?.[0] })
  const series = useQuery({
    queryKey: ['series', addDays(today, -29), today],
    queryFn: async () => (await supabase.rpc('daily_series', { from_d: addDays(today, -29), to_d: today })).data as { d: string; litres: number; sold: number; revenue: number; expense: number }[],
  })
  const { data: exp = [] } = useExpenses(ms, me)
  const { data: ledger = [] } = useLedger()
  const { data: animals = [] } = useAnimals()
  const { data: med = [] } = useMedical()
  const { data: wd = [] } = useWithdrawal()

  const m = month.data
  const chart = (series.data || []).map((r) => ({ ...r, label: fmtDate(r.d).slice(0, 5), litres: Number(r.litres), revenue: Number(r.revenue), expense: Number(r.expense) }))
  const cat = Object.entries(groupBy(exp, (e) => e.category)).map(([name, r]) => ({ name, value: sum(r, (e) => e.amount) }))
  const dues = sum(ledger, (l) => Math.max(0, Number(l.outstanding)))
  const upcoming = med.filter((x) => x.next_due_date && x.next_due_date <= addDays(today, 7)).sort((a, b) => a.next_due_date!.localeCompare(b.next_due_date!))
  const tag = (id: string) => animals.find((a) => a.id === id)?.tag_no

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-brand-900">{t('nav.dashboard')}</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t('admin.kpiMilkToday')} value={`${L(day.data?.litres)} L`} />
        <Kpi label={t('admin.kpiMilkMonth')} value={`${L(m?.litres)} L`} />
        <Kpi label={t('admin.revenue') + ' (' + t('month') + ')'} value={inr(m?.revenue)} />
        <Kpi label={t('admin.expenses') + ' (' + t('month') + ')'} value={inr(Number(m?.expenses || 0) + Number(m?.medical || 0) + Number(m?.labour || 0))} tone="text-amber-700" />
        <Kpi label={t('cash.month')} value={inr(m?.cash)} />
        <Kpi label={t('admin.profit')} value={inr(m?.profit)} tone={Number(m?.profit) >= 0 ? 'text-brand-700' : 'text-red-700'} />
        <Kpi label={t('admin.costPerLitre')} value={inr(m?.cost_per_litre)} />
        <Kpi label={t('admin.dues')} value={inr(dues)} tone="text-red-700" />
        <Kpi label={t('admin.activeAnimals')} value={String(animals.filter((a) => !a.archived && a.status !== 'Sold' && a.status !== 'Dead').length)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-bold">{t('admin.milkTrend')}</h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" fontSize={11} interval={3} /><YAxis fontSize={11} /><Tooltip />
              <Area dataKey="litres" name="Litres" stroke="#15803d" fill="#bbf7d0" /></AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <h2 className="mb-2 font-bold">{t('admin.incomeExpense')}</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" fontSize={11} interval={3} /><YAxis fontSize={11} /><Tooltip /><Legend />
              <Bar dataKey="revenue" name={t('admin.revenue')} fill="#15803d" /><Bar dataKey="expense" name={t('admin.expenses')} fill="#f59e0b" /></BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <h2 className="mb-2 font-bold">{t('admin.expByCat')}</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart><Pie data={cat} dataKey="value" nameKey="name" outerRadius={90} label={(e) => e.name}>{cat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={(v: number) => inr(v)} /></PieChart>
          </ResponsiveContainer>
        </Card>
        <Card className="space-y-2">
          <h2 className="font-bold">🔔 {t('home.alerts')}</h2>
          {wd.map((w) => <div key={w.animal_id + w.until} className="rounded-lg bg-red-50 p-2 text-sm text-red-800"><b>{w.tag_no}</b> – {t('milk.doNotSell')} → {fmtDate(w.until)}</div>)}
          {upcoming.map((x) => (
            <Link key={x.id} to={`/admin/animals/${x.animal_id}`} className={`block rounded-lg p-2 text-sm ${x.next_due_date! < today ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900'}`}>
              <b>{tag(x.animal_id)}</b> – {x.type} <Badge tone="amber">{fmtDate(x.next_due_date)}</Badge>
            </Link>
          ))}
          {!wd.length && !upcoming.length && <div className="text-gray-500">{t('home.noAlerts')}</div>}
        </Card>
      </div>
    </div>
  )
}
