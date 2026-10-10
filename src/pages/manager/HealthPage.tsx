import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAnimals, useMedical } from '@/lib/data'
import { useSave } from '@/lib/useSave'
import { useToast } from '@/components/Toast'
import { useAuth } from '@/lib/auth'
import { Button, Card, Field, Input, Select, Textarea } from '@/components/ui'
import DeleteButton from '@/components/DeleteButton'
import { addDays, fmtDate, todayIST } from '@/lib/format'
import { uuid } from '@/lib/utils'
import { uploadFile } from '@/lib/supabase'
import { MED_TYPES } from '@/lib/types'

/** Reusable medical entry form (used by manager Health page). */
export function MedicalForm({ onDone }: { onDone?: () => void }) {
  const { t } = useTranslation()
  const { isAdmin, settings } = useAuth()
  const save = useSave()
  const toast = useToast()
  const today = todayIST()
  const { data: animals = [] } = useAnimals()
  const [f, setF] = useState({ animal_id: '', entry_date: today, type: 'Treatment', symptoms: '', medicine: '', dose: '', vet_name: '', cost: '', withdrawal_days: '', next_due_date: '', notes: '', photo_url: '' })
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }))
  const minDate = isAdmin ? undefined : addDays(today, -(settings?.manager_edit_days ?? 2))

  const submit = async () => {
    if (!f.animal_id) return toast(t('milk.animal'), 'err')
    const ok = await save('medical_records', 'insert', {
      id: uuid(), animal_id: f.animal_id, entry_date: f.entry_date, type: f.type, symptoms: f.symptoms || null, medicine: f.medicine || null,
      dose: f.dose || null, vet_name: f.vet_name || null, cost: Number(f.cost) || 0, withdrawal_days: Number(f.withdrawal_days) || 0,
      next_due_date: f.next_due_date || null, notes: f.notes || null, photo_url: f.photo_url || null,
    })
    if (ok) {
      setF((s) => ({ ...s, symptoms: '', medicine: '', dose: '', cost: '', withdrawal_days: '', next_due_date: '', notes: '', photo_url: '' }))
      onDone?.()
    }
  }
  const onPhoto = async (file?: File) => {
    if (!file) return
    try { set('photo_url', await uploadFile('bills', file)) } catch (e: any) { toast(e.message || 'Upload failed', 'err') }
  }

  return (
    <Card className="space-y-3">
      <Field label={t('milk.animal')}>
        <Select big value={f.animal_id} onChange={(e) => set('animal_id', e.target.value)}>
          <option value="">–</option>
          {animals.filter((a) => !a.archived).map((a) => <option key={a.id} value={a.id}>{a.tag_no} {a.name || ''}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t('type')}><Select value={f.type} onChange={(e) => set('type', e.target.value)}>{MED_TYPES.map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <Field label={t('date')}><Input type="date" value={f.entry_date} min={minDate} max={today} onChange={(e) => set('entry_date', e.target.value)} /></Field>
      </div>
      <Field label={t('health.symptoms')}><Input value={f.symptoms} onChange={(e) => set('symptoms', e.target.value)} /></Field>
      <Field label={t('health.medicine')}><Input value={f.medicine} onChange={(e) => set('medicine', e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t('health.dose')}><Input value={f.dose} onChange={(e) => set('dose', e.target.value)} /></Field>
        <Field label={t('health.vet')}><Input value={f.vet_name} onChange={(e) => set('vet_name', e.target.value)} /></Field>
        <Field label={t('health.cost') + ' ₹'}><Input type="number" inputMode="decimal" value={f.cost} onChange={(e) => set('cost', e.target.value)} /></Field>
        <Field label={t('health.withdrawalDays')}><Input type="number" inputMode="numeric" value={f.withdrawal_days} onChange={(e) => set('withdrawal_days', e.target.value)} /></Field>
      </div>
      <Field label={t('health.nextDue')}><Input type="date" value={f.next_due_date} onChange={(e) => set('next_due_date', e.target.value)} /></Field>
      <Field label={t('notes')}><Textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
      <Field label={t('animal.photo')}><input type="file" accept="image/*" capture="environment" onChange={(e) => onPhoto(e.target.files?.[0])} />{f.photo_url && <span className="text-green-700"> ✔</span>}</Field>
      <Button size="lg" className="w-full" onClick={submit}>{t('save')}</Button>
    </Card>
  )
}

export default function HealthPage() {
  const { t } = useTranslation()
  const { data: med = [] } = useMedical()
  const { data: animals = [] } = useAnimals()
  const tag = (id: string) => animals.find((a) => a.id === id)?.tag_no ?? ''
  return (
    <div className="space-y-3">
      <MedicalForm />
      <h2 className="text-lg font-extrabold text-brand-900">{t('health.title')}</h2>
      <Card className="divide-y divide-gray-100 !p-0">
        {med.slice(0, 25).map((m) => (
          <div key={m.id} className="px-4 py-2">
            <div className="flex justify-between"><b>{tag(m.animal_id)} · {m.type}</b><span className="flex items-center text-sm text-gray-600">{fmtDate(m.entry_date)}<DeleteButton table="medical_records" id={m.id} date={m.entry_date} /></span></div>
            <div className="text-sm text-gray-700">{m.medicine || m.symptoms}</div>
          </div>
        ))}
        {!med.length && <div className="p-4 text-center text-gray-500">{t('noData')}</div>}
      </Card>
    </div>
  )
}
