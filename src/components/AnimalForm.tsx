import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Field, Input, Modal, Select, Textarea } from './ui'
import { useSave } from '@/lib/useSave'
import { useToast } from './Toast'
import { uploadFile } from '@/lib/supabase'
import { uuid } from '@/lib/utils'
import { toNum } from '@/lib/format'
import { ANIMAL_TYPES, BREEDS, STATUSES, type Animal } from '@/lib/types'

export default function AnimalForm({ animal, onClose }: { animal?: Animal | null; onClose: () => void }) {
  const { t } = useTranslation()
  const save = useSave()
  const toast = useToast()
  const [f, setF] = useState({
    tag_no: animal?.tag_no ?? '', name: animal?.name ?? '', type: animal?.type ?? 'Cow', breed: animal?.breed ?? 'Crossbred',
    dob: animal?.dob ?? '', purchase_date: animal?.purchase_date ?? '', purchase_price: animal?.purchase_price?.toString() ?? '',
    source: animal?.source ?? '', status: animal?.status ?? 'Lactating', notes: animal?.notes ?? '', photo_url: animal?.photo_url ?? '',
  })
  const [busy, setBusy] = useState(false)
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }))

  const onPhoto = async (file?: File) => {
    if (!file) return
    try {
      set('photo_url', await uploadFile('animal-photos', file))
    } catch (e: any) {
      toast(e.message || t('error'), 'err')
    }
  }

  const submit = async () => {
    if (!f.tag_no.trim()) return toast('Tag number required', 'err')
    setBusy(true)
    const row = {
      id: animal?.id ?? uuid(),
      tag_no: f.tag_no.trim(), name: f.name || null, type: f.type, breed: f.breed, dob: f.dob || null,
      purchase_date: f.purchase_date || null, purchase_price: toNum(f.purchase_price), source: f.source || null,
      status: f.status, notes: f.notes || null, photo_url: f.photo_url || null,
    }
    const ok = await save('animals', 'upsert', row)
    setBusy(false)
    if (ok) onClose()
  }

  return (
    <Modal open onClose={onClose} title={animal ? t('edit') : t('add')}>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('animal.tag')}><Input value={f.tag_no} onChange={(e) => set('tag_no', e.target.value)} /></Field>
        <Field label={t('name')}><Input value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label={t('type')}><Select value={f.type} onChange={(e) => set('type', e.target.value)}>{ANIMAL_TYPES.map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <Field label={t('animal.breed')}><Select value={f.breed} onChange={(e) => set('breed', e.target.value)}>{BREEDS.map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <Field label={t('animal.dob')}><Input type="date" value={f.dob} onChange={(e) => set('dob', e.target.value)} /></Field>
        <Field label={t('status')}><Select value={f.status} onChange={(e) => set('status', e.target.value)}>{STATUSES.map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <Field label={t('animal.purchaseDate')}><Input type="date" value={f.purchase_date} onChange={(e) => set('purchase_date', e.target.value)} /></Field>
        <Field label={t('animal.purchasePrice')}><Input type="number" inputMode="decimal" value={f.purchase_price} onChange={(e) => set('purchase_price', e.target.value)} /></Field>
        <Field label={t('animal.source')} className="col-span-2"><Input value={f.source} onChange={(e) => set('source', e.target.value)} /></Field>
        <Field label={t('animal.photo')} className="col-span-2">
          <input type="file" accept="image/*" onChange={(e) => onPhoto(e.target.files?.[0])} />
          {f.photo_url && <img src={f.photo_url} className="mt-2 h-24 rounded-lg object-cover" alt="" />}
        </Field>
        <Field label={t('notes')} className="col-span-2"><Textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>{t('cancel')}</Button>
        <Button className="flex-1" disabled={busy} onClick={submit}>{t('save')}</Button>
      </div>
    </Modal>
  )
}
