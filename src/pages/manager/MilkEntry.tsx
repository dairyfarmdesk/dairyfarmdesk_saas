import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAnimals, useMilk, useWithdrawal } from '@/lib/data'
import { useSave } from '@/lib/useSave'
import { useToast } from '@/components/Toast'
import { useAuth } from '@/lib/auth'
import { Button, Card, Field, Input, Segmented, Select } from '@/components/ui'
import DeleteButton from '@/components/DeleteButton'
import { addDays, currentShift, fmtDate, L, todayIST, toNum } from '@/lib/format'
import { sum, uuid } from '@/lib/utils'
import type { Shift } from '@/lib/types'

export default function MilkEntry() {
  const { t } = useTranslation()
  const { isAdmin, settings } = useAuth()
  const toast = useToast()
  const save = useSave()
  const today = todayIST()
  const [date, setDate] = useState(today)
  const [shift, setShift] = useState<Shift>(currentShift())
  const [mode, setMode] = useState<'quick' | 'single'>('quick')
  const minDate = isAdmin ? undefined : addDays(today, -(settings?.manager_edit_days ?? 2))

  const { data: animals = [] } = useAnimals()
  const { data: wd = [] } = useWithdrawal()
  const { data: recent = [] } = useMilk(addDays(date, -7), date)
  const lact = animals.filter((a) => a.status === 'Lactating' && !a.archived)

  const dayRows = recent.filter((m) => m.entry_date === date)
  const existing = (aid: string) => dayRows.find((m) => m.animal_id === aid && m.shift === shift)

  const [vals, setVals] = useState<Record<string, { l: string; fat: string; snf: string }>>({})
  useEffect(() => {
    const v: typeof vals = {}
    for (const a of animals) {
      const e = dayRows.find((m) => m.animal_id === a.id && m.shift === shift)
      if (e) v[a.id] = { l: String(e.litres), fat: e.fat?.toString() ?? '', snf: e.snf?.toString() ?? '' }
    }
    setVals(v)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, shift, recent.length, animals.length])

  const setV = (id: string, k: 'l' | 'fat' | 'snf', v: string) =>
    setVals((s) => ({ ...s, [id]: { ...(s[id] ?? { l: '', fat: '', snf: '' }), [k]: v } }))
  const wdSet = useMemo(() => new Set(wd.map((w) => w.animal_id)), [wd])

  // 7-day average for the same shift (needs at least 3 earlier entries)
  const avg7 = (aid: string) => {
    const r = recent.filter((m) => m.animal_id === aid && m.shift === shift && m.entry_date < date)
    return r.length >= 3 ? sum(r, (x) => x.litres) / r.length : null
  }
  const unusual = (aid: string, l: number) => {
    const a = avg7(aid)
    return a != null && a > 0 && (l > a * 1.5 || l < a * 0.5)
  }

  const shiftTotal = sum(Object.values(vals), (v) => Number(v.l))
  const filled = Object.values(vals).filter((v) => v.l !== '' && Number(v.l) > 0).length
  const otherShift = shift === 'Morning' ? 'Evening' : 'Morning'
  const otherTotal = sum(dayRows.filter((m) => m.shift === otherShift), (m) => m.litres)

  const [busy, setBusy] = useState(false)
  const saveAll = async (ids: string[]) => {
    const entries = ids.filter((id) => vals[id]?.l !== '' && vals[id]?.l != null && Number(vals[id].l) >= 0)
    if (!entries.length) return toast(t('noData'), 'err')
    const odd = entries.filter((id) => unusual(id, Number(vals[id].l)))
    if (odd.length) {
      const names = odd.map((id) => animals.find((a) => a.id === id)?.tag_no).join(', ')
      if (!window.confirm(`${t('milk.unusual')}: ${names}\n${t('milk.confirmUnusual')}`)) return
    }
    setBusy(true)
    // Upsert on (animal, date, shift): re-saving edits the existing row, so duplicates are impossible.
    const payload = entries.map((id) => ({
      id: existing(id)?.id ?? uuid(),
      animal_id: id, entry_date: date, shift, litres: Number(vals[id].l), fat: toNum(vals[id].fat), snf: toNum(vals[id].snf),
    }))
    await save('milk_production', 'upsert', payload, { onConflict: 'animal_id,entry_date,shift' })
    setBusy(false)
  }

  const [single, setSingle] = useState('')
  const sAnimal = animals.find((a) => a.id === single)

  return (
    <div className="space-y-3">
      <Card className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('date')}>
            <Input big type="date" value={date} min={minDate} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </Field>
          <Field label={fmtDate(date)}>
            <Segmented value={shift} onChange={setShift} options={[{ v: 'Morning', label: '☀ ' + t('morning') }, { v: 'Evening', label: '🌙 ' + t('evening') }]} />
          </Field>
        </div>
        <Segmented value={mode} onChange={setMode} options={[{ v: 'quick', label: t('milk.quick') }, { v: 'single', label: t('milk.single') }]} />
      </Card>

      {wd.length > 0 && (
        <div className="rounded-2xl bg-red-600 p-3 text-white">
          <div className="text-lg font-extrabold">⚠ {t('milk.doNotSell')}</div>
          <div className="text-sm">{wd.map((w) => `${w.tag_no} (${fmtDate(w.until)})`).join(', ')}</div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 text-center">
        <Card className="!p-2"><div className="text-xs text-gray-600">{t('milk.shiftTotal')}</div><div className="text-2xl font-extrabold text-brand-800">{L(shiftTotal)}</div></Card>
        <Card className="!p-2"><div className="text-xs text-gray-600">{t('milk.dayTotal')}</div><div className="text-2xl font-extrabold text-brand-800">{L(shiftTotal + otherTotal)}</div></Card>
        <Card className="!p-2"><div className="text-xs text-gray-600">{t('milk.avg')}</div><div className="text-2xl font-extrabold text-brand-800">{filled ? L(shiftTotal / filled) : '0.0'}</div></Card>
      </div>
      {mode === 'quick' ? (
        <>
          {lact.length === 0 && <div className="p-6 text-center text-gray-500">{t('milk.noLactating')}</div>}
          <div className="grid gap-3 lg:grid-cols-2">
          {lact.map((a) => {
            const v = vals[a.id]
            const bad = v?.l !== undefined && v.l !== '' && unusual(a.id, Number(v.l))
            const ex = existing(a.id)
            return (
              <Card key={a.id} className={`flex items-center gap-3 !p-3 ${wdSet.has(a.id) ? '!border-red-500 !bg-red-50' : ''} ${bad ? '!border-amber-500' : ''}`}>
                <div className="min-w-0 flex-1">
                  <div className="text-xl font-extrabold">{a.tag_no}</div>
                  <div className="truncate text-sm text-gray-600">{a.name || a.breed}</div>
                  {wdSet.has(a.id) && <div className="text-xs font-extrabold text-red-700">⚠ {t('milk.doNotSell')}</div>}
                  {bad && <div className="text-xs font-bold text-amber-700">{t('milk.unusual')} ({L(avg7(a.id))})</div>}
                  {ex && <div className="text-xs text-brand-700">✔ {t('saved')}</div>}
                </div>
                <Input big type="number" inputMode="decimal" step="0.1" min="0" placeholder="0.0" className="!w-28 text-center" value={v?.l ?? ''} onChange={(e) => setV(a.id, 'l', e.target.value)} />
              </Card>
            )
          })}
          </div>
          <div className="sticky bottom-24 z-10 md:bottom-4">
            <Button size="lg" className="w-full shadow-xl" disabled={busy || !filled} onClick={() => saveAll(lact.map((a) => a.id))}>
              {t('milk.saveAll')} ({filled}) · {L(shiftTotal)} L
            </Button>
          </div>
        </>
      ) : (
        <Card className="space-y-3">
          <Field label={t('milk.animal')}>
            <Select big value={single} onChange={(e) => setSingle(e.target.value)}>
              <option value="">–</option>
              {animals.filter((a) => !a.archived && a.status !== 'Sold' && a.status !== 'Dead').map((a) => <option key={a.id} value={a.id}>{a.tag_no} {a.name || ''}{wdSet.has(a.id) ? ' ⚠' : ''}</option>)}
            </Select>
          </Field>
          {single && wdSet.has(single) && <div className="rounded-xl bg-red-600 p-2 font-extrabold text-white">⚠ {t('milk.doNotSell')}</div>}
          {single && existing(single) && <div className="rounded-xl bg-amber-100 p-2 text-sm font-bold text-amber-900">{t('milk.duplicate')} – {t('edit')}</div>}
          <Field label={t('litres')}><Input big type="number" inputMode="decimal" step="0.1" min="0" value={vals[single]?.l ?? ''} onChange={(e) => single && setV(single, 'l', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('milk.fat')}><Input type="number" inputMode="decimal" step="0.1" value={vals[single]?.fat ?? ''} onChange={(e) => single && setV(single, 'fat', e.target.value)} /></Field>
            <Field label={t('milk.snf')}><Input type="number" inputMode="decimal" step="0.1" value={vals[single]?.snf ?? ''} onChange={(e) => single && setV(single, 'snf', e.target.value)} /></Field>
          </div>
          {sAnimal && avg7(sAnimal.id) != null && <div className="text-sm text-gray-600">7-day avg ({shift}): {L(avg7(sAnimal.id))} L</div>}
          <Button size="lg" className="w-full" disabled={busy || !single || !vals[single]?.l} onClick={() => saveAll([single])}>{t('save')}</Button>
        </Card>
      )}

      <h2 className="pt-2 text-lg font-extrabold text-brand-900">{t('milk.entries')} – {fmtDate(date)}</h2>
      <Card className="divide-y divide-gray-100 !p-0">
        {dayRows.map((m) => (
          <div key={m.id} className="flex items-center justify-between px-4 py-2">
            <span className="font-bold">{animals.find((a) => a.id === m.animal_id)?.tag_no}</span>
            <span className="text-sm text-gray-600">{m.shift === 'Morning' ? t('morning') : t('evening')}</span>
            <span className="flex items-center font-extrabold">{L(m.litres)} L<DeleteButton table="milk_production" id={m.id} date={m.entry_date} /></span>
          </div>
        ))}
        {!dayRows.length && <div className="p-4 text-center text-gray-500">{t('noData')}</div>}
      </Card>
    </div>
  )
}
