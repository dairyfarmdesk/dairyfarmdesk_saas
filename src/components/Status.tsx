import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Cloud, CloudOff, Languages, RefreshCw } from 'lucide-react'
import { setLang } from '@/lib/i18n'
import { syncQueue, useOnline, useQueue } from '@/lib/offline'
import { useToast } from './Toast'

export function LangToggle({ light }: { light?: boolean }) {
  const { i18n } = useTranslation()
  const hi = i18n.language === 'hi'
  return (
    <button
      onClick={() => setLang(hi ? 'en' : 'hi')}
      className={`flex h-10 items-center gap-1 rounded-full px-3 text-sm font-bold ${light ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-800'}`}
    >
      <Languages className="h-4 w-4" /> {hi ? 'EN' : 'हिं'}
    </button>
  )
}

/** Keeps the offline queue syncing and shows online / pending state. */
export function SyncStatus({ light }: { light?: boolean }) {
  const { t } = useTranslation()
  const online = useOnline()
  const q = useQueue()
  const qc = useQueryClient()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const sync = async () => {
    setBusy(true)
    await syncQueue(() => {
      qc.invalidateQueries()
      toast(t('saved'))
    })
    setBusy(false)
  }

  useEffect(() => {
    if (online) sync()
    const id = setInterval(() => navigator.onLine && syncQueue(() => qc.invalidateQueries()), 30000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online])

  const failed = q.filter((i) => i.error).length
  return (
    <button onClick={sync} className={`flex h-10 items-center gap-1 rounded-full px-3 text-sm font-bold ${light ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-800'}`}>
      {online ? <Cloud className="h-4 w-4" /> : <CloudOff className="h-4 w-4 text-amber-300" />}
      {!online && t('offline')}
      {q.length > 0 && <span className="rounded-full bg-amber-500 px-2 text-white">{q.length} {failed ? '!' : t('pending')}</span>}
      {busy && <RefreshCw className="h-4 w-4 animate-spin" />}
    </button>
  )
}
