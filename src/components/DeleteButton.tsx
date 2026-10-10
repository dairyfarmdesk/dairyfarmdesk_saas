import { useTranslation } from 'react-i18next'
import { useSave } from '@/lib/useSave'
import { useCanEdit } from '@/lib/useCanEdit'

/**
 * Small red ✕ that deletes one record after a confirm. Shown to admins always, and to managers only while the
 * record's date is inside the manager edit window (the database enforces the same rule).
 */
export default function DeleteButton({ table, id, date, label }: { table: string; id: string; date: string; label?: string }) {
  const { t } = useTranslation()
  const save = useSave()
  const canEdit = useCanEdit()
  if (!canEdit(date)) return null
  return (
    <button
      type="button"
      className="px-2 py-1 text-red-600 hover:bg-red-50 rounded-lg"
      aria-label={t('delete')}
      onClick={() => window.confirm(`${t('delete')}${label ? ' ' + label : ''}?`) && save(table, 'delete', undefined, { id })}
    >
      ✕
    </button>
  )
}
