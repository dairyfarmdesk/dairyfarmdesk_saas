import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Calendar } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '@/lib/supabase'
import { useAnimals, useExpenses, useLedger, useMedical, useWithdrawal } from '@/lib/data'
import { Badge, Card, Input } from '@/components/ui'
import { addDays, fmtDate, inr, L, monthEnd, monthStart, prevMonthRange, todayIST, yearStart } from '@/lib/format'
import { cn, groupBy, sum } from '@/lib/utils'

const COLORS = ['#15803d', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#64748b']

const Kpi = ({ label, value, tone, sub }: { label: string; value: string; tone?: string; sub?: string }) => (
  <Card>
    <div className="text-xs font-semibold uppercase text-gray-500">{label}</div>
    <div className={`text-2xl font-extrabold ${tone || 'text-brand-800'}`}>{value}</div>
    {sub && <div className="mt-0.5 text-xs font-medium text-gray-500">{sub}</div>}
  </Card>
)

export default function Dashboard() {
  const { t } = useTranslation()
  const today = todayIST()
  const [from, setFrom] = useState(monthStart(today))
  const [to, setTo] = useState(monthEnd(today))

  const prevMonth = useMemo(() => prevMonthRange(today), [today])

  const activePreset = useMemo(() => {
    if (from === today && to === today) return 'today'
    if (from === addDays(today, -6) && to === today) return '7d'
    if (from === monthStart(today) && to === monthEnd(today)) return 'month'
    if (from === prevMonth.from && to === prevMonth.to) return 'prevMonth'
    if (from === addDays(today, -29) && to === today) return '30d'
    if (from === yearStart(today) && to === today) return 'year'
    return 'custom'
  }, [from, to, today, prevMonth])

  const periodLabel = useMemo(() => {
    if (activePreset === 'today') return t('today')
    if (activePreset === '7d') return t('thisWeek')
    if (activePreset === 'month') return t('month')
    if (activePreset === 'prevMonth') return t('lastMonth')
    if (activePreset === '30d') return t('last30Days')
    if (activePreset === 'year') return t('thisYear')
    if (from === to) return fmtDate(from)
    return `${fmtDate(from)} – ${fmtDate(to)}`
  }, [activePreset, from, to, t])

  const handlePreset = (id: string) => {
    if (id === 'today') { setFrom(today); setTo(today) }
    else if (id === '7d') { setFrom(addDays(today, -6)); setTo(today) }
    else if (id === 'month') { setFrom(monthStart(today)); setTo(monthEnd(today)) }
    else if (id === 'prevMonth') { setFrom(prevMonth.from); setTo(prevMonth.to) }
    else if (id === '30d') { setFrom(addDays(today, -29)); setTo(today) }
    else if (id === 'year') { setFrom(yearStart(today)); setTo(today) }
  }

  const handleFromChange = (val: string) => {
    setFrom(val)
    if (to && val > to) setTo(val)
  }

  const handleToChange = (val: string) => {
    setTo(val)
    if (from && val < from) setFrom(val)
  }

  const summary = useQuery({
    queryKey: ['sum', from, to],
    queryFn: async () => (await supabase.rpc('admin_summary', { from_d: from, to_d: to })).data?.[0],
    enabled: Boolean(from && to && from <= to),
  })
  const day = useQuery({
    queryKey: ['sum', today, today],
    queryFn: async () => (await supabase.rpc('admin_summary', { from_d: today, to_d: today })).data?.[0],
  })
  const series = useQuery({
    queryKey: ['series', from, to],
    queryFn: async () => (await supabase.rpc('daily_series', { from_d: from, to_d: to })).data as { d: string; litres: number; sold: number; revenue: number; expense: number }[],
    enabled: Boolean(from && to && from <= to),
  })
  const { data: exp = [] } = useExpenses(from, to)
  const { data: ledger = [] } = useLedger()
  const { data: animals = [] } = useAnimals()
  const { data: med = [] } = useMedical()
  const { data: wd = [] } = useWithdrawal()

  const m = summary.data
  const chart = (series.data || []).map((r) => ({ ...r, label: fmtDate(r.d).slice(0, 5), litres: Number(r.litres), revenue: Number(r.revenue), expense: Number(r.expense) }))
  const cat = Object.entries(groupBy(exp, (e) => e.category)).map(([name, r]) => ({ name, value: sum(r, (e) => e.amount) }))
  const dues = sum(ledger, (l) => Math.max(0, Number(l.outstanding)))
  const upcoming = med.filter((x) => x.next_due_date && x.next_due_date <= addDays(today, 7)).sort((a, b) => a.next_due_date!.localeCompare(b.next_due_date!))
  const tag = (id: string) => animals.find((a) => a.id === id)?.tag_no

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold text-brand-900">{t('nav.dashboard')}</h1>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <Calendar className="mr-1 h-4 w-4 shrink-0 text-brand-700" />
          {[
            { id: 'today', label: t('today') },
            { id: '7d', label: t('thisWeek') },
            { id: 'month', label: t('month') },
            { id: 'prevMonth', label: t('lastMonth') },
            { id: '30d', label: t('last30Days') },
            { id: 'year', label: t('thisYear') },
          ].map((p) => {
            const active = activePreset === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePreset(p.id)}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs font-bold transition',
                  active
                    ? 'bg-brand-700 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95',
                )}
              >
                {p.label}
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-500">{t('from')}</span>
            <Input
              type="date"
              className="!h-9 !w-36 text-xs"
              value={from}
              onChange={(e) => handleFromChange(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-500">{t('to')}</span>
            <Input
              type="date"
              className="!h-9 !w-36 text-xs"
              value={to}
              onChange={(e) => handleToChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t('admin.kpiMilkToday')} value={`${L(day.data?.litres)} L`} />
        <Kpi label={`${t('milk.title')} (${periodLabel})`} value={`${L(m?.litres)} L`} />
        <Kpi
          label={`${t('admin.revenue')} (${periodLabel})`}
          value={inr(m?.revenue)}
          tone="text-emerald-700"
          sub={m?.sold_litres && Number(m.sold_litres) > 0 ? `${L(m.sold_litres)} L ${t('home.sold')}` : undefined}
        />
        <Kpi
          label={`${t('admin.expenses')} (${periodLabel})`}
          value={inr(Number(m?.expenses || 0) + Number(m?.medical || 0) + Number(m?.labour || 0))}
          tone="text-amber-700"
        />
        <Kpi label={`${t('nav.cash')} (${periodLabel})`} value={inr(m?.cash)} />
        <Kpi
          label={`${t('admin.profit')} (${periodLabel})`}
          value={inr(m?.profit)}
          tone={Number(m?.profit) >= 0 ? 'text-brand-700' : 'text-red-700'}
        />
        <Kpi label={`${t('admin.costPerLitre')} (${periodLabel})`} value={inr(m?.cost_per_litre)} />
        <Kpi label={t('admin.dues')} value={inr(dues)} tone="text-red-700" />
        <Kpi label={t('admin.activeAnimals')} value={String(animals.filter((a) => !a.archived && a.status !== 'Sold' && a.status !== 'Dead').length)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold">{t('admin.milkTrend')}</h2>
            <span className="text-xs font-semibold text-gray-400">{periodLabel}</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={11} interval={chart.length > 30 ? Math.floor(chart.length / 8) : chart.length > 14 ? 2 : 0} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Area dataKey="litres" name={t('litres')} stroke="#15803d" fill="#bbf7d0" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold">{t('admin.incomeExpense')}</h2>
            <span className="text-xs font-semibold text-gray-400">{periodLabel}</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={11} interval={chart.length > 30 ? Math.floor(chart.length / 8) : chart.length > 14 ? 2 : 0} />
              <YAxis fontSize={11} />
              <Tooltip formatter={(v: number) => inr(v)} />
              <Legend />
              <Bar dataKey="revenue" name={t('admin.revenue')} fill="#15803d" />
              <Bar dataKey="expense" name={t('admin.expenses')} fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold">{t('admin.expByCat')}</h2>
            <span className="text-xs font-semibold text-gray-400">{periodLabel}</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            {cat.length > 0 ? (
              <PieChart>
                <Pie data={cat} dataKey="value" nameKey="name" outerRadius={90} label={(e) => e.name}>
                  {cat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => inr(v)} />
              </PieChart>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">{t('noData')}</div>
            )}
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

