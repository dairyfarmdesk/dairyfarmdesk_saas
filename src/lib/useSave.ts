import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/components/Toast'
import { mutate } from './offline'

/** Saves via the offline-aware mutation layer, shows the toast, refreshes data. Returns true if saved/queued. */
export function useSave() {
  const qc = useQueryClient()
  const toast = useToast()
  const { t } = useTranslation()
  return async (table: string, op: 'insert' | 'upsert' | 'update' | 'delete', payload?: any, opts?: { id?: string; onConflict?: string }) => {
    const r = await mutate(table, op, payload, opts)
    if (r.error) {
      toast(r.error, 'err')
      return false
    }
    toast(r.queued ? t('savedQueued') : t('saved'), r.queued ? 'warn' : 'ok')
    qc.invalidateQueries()
    return true
  }
}
