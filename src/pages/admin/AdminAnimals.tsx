import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAnimals } from '@/lib/data'
import { useSave } from '@/lib/useSave'
import { Badge, Button } from '@/components/ui'
import { DataTable } from '@/components/DataTable'
import AnimalForm from '@/components/AnimalForm'
import { fmtDate } from '@/lib/format'
import type { Animal } from '@/lib/types'

export default function AdminAnimals() {
  const { t } = useTranslation()
  const { data = [] } = useAnimals()
  const save = useSave()
  const [edit, setEdit] = useState<Animal | null | undefined>(undefined)
  const [showArch, setShowArch] = useState(false)
  const rows = data.filter((a) => showArch || !a.archived)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-brand-900">{t('animal.title')}</h1>
        <Button onClick={() => setEdit(null)}>+ {t('add')}</Button>
      </div>
      <DataTable
        rows={rows}
        exportName="animals"
        rowKey={(a) => a.id}
        toolbar={<label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={showArch} onChange={(e) => setShowArch(e.target.checked)} /> {t('animal.showArchived')}</label>}
        cols={[
          { key: 'tag', header: t('animal.tag'), value: (a) => a.tag_no, render: (a) => <Link className="font-bold text-brand-700 underline" to={`/admin/animals/${a.id}`}>{a.tag_no}</Link> },
          { key: 'name', header: t('name'), value: (a) => a.name },
          { key: 'type', header: t('type'), value: (a) => a.type },
          { key: 'breed', header: t('animal.breed'), value: (a) => a.breed },
          { key: 'dob', header: t('animal.dob'), value: (a) => fmtDate(a.dob) },
          { key: 'pd', header: t('animal.purchaseDate'), value: (a) => fmtDate(a.purchase_date) },
          { key: 'pp', header: t('animal.purchasePrice'), value: (a) => a.purchase_price ?? '', align: 'right' },
          { key: 'src', header: t('animal.source'), value: (a) => a.source },
          { key: 'st', header: t('status'), value: (a) => a.status, render: (a) => <><Badge tone={a.status === 'Lactating' ? 'green' : 'gray'}>{a.status}</Badge>{a.archived && <Badge tone="amber">{t('animal.archived')}</Badge>}</> },
        ]}
        actions={(a) => (
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="outline" onClick={() => setEdit(a)}>{t('edit')}</Button>
            <Button size="sm" variant="ghost" onClick={() => save('animals', 'update', { archived: !a.archived }, { id: a.id })}>{a.archived ? '↩' : t('animal.archive')}</Button>
          </div>
        )}
      />
      {edit !== undefined && <AnimalForm animal={edit} onClose={() => setEdit(undefined)} />}
    </div>
  )
}
