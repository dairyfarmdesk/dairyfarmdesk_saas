import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase, DB_SCHEMA } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/components/Toast'
import { Badge, Button, Card } from '@/components/ui'
import { fmtDate } from '@/lib/format'
import AddFarmModal, { type NewFarmLogin } from './AddFarmModal'

interface FarmRow {
  farm_id: string; farm_name: string; status: 'active' | 'suspended'; plan: string; created_at: string
  user_count: number; animal_count: number; customer_count: number; last_activity: string | null
}

/** Platform owner console: add farms (invite-only), see usage, suspend / reactivate. Only for emails in platform_admins. */
export default function PlatformPage() {
  const { t } = useTranslation()
  const { isPlatformAdmin, loading } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [done, setDone] = useState<NewFarmLogin | null>(null)

  const { data: farms = [] } = useQuery({
    queryKey: ['platform-farms'],
    enabled: isPlatformAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('platform_farms')
      if (error) throw error
      return data as FarmRow[]
    },
  })

  if (loading) return null
  if (!isPlatformAdmin) return <Navigate to="/" replace />

  const setStatus = async (row: FarmRow) => {
    const next = row.status === 'active' ? 'suspended' : 'active'
    const note = next === 'suspended' ? '\nThe farm becomes read-only. No data is deleted.' : ''
    if (!window.confirm(`${next === 'suspended' ? 'Suspend' : 'Reactivate'} ${row.farm_name}?${note}`)) return
    const { error } = await supabase.rpc('platform_set_farm_status', { p_farm: row.farm_id, p_status: next })
    if (error) return toast(error.message, 'err')
    toast(t('saved'))
    qc.invalidateQueries({ queryKey: ['platform-farms'] })
  }

  const login = done
    ? `Farm: ${done.farm}\nSign in: ${window.location.origin}/login\nEmail: ${done.email}\nTemporary password: ${done.password}\nPlease change the password after the first sign-in.`
    : ''

  return (
    <div className="mx-auto min-h-screen max-w-4xl space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold text-brand-900">Platform · Farms {DB_SCHEMA === 'stg' && <Badge tone="amber">staging</Badge>}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.history.back()}>{t('back')}</Button>
          <Button onClick={() => setAdding(true)}>+ Add farm</Button>
        </div>
      </div>

      {done && (
        <Card className="space-y-2 border-green-300 bg-green-50">
          <div className="font-extrabold text-green-900">Farm created. Send these login details to the owner (shown only now):</div>
          <pre className="whitespace-pre-wrap rounded-lg bg-white p-3 text-sm">{login}</pre>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => navigator.clipboard.writeText(login).then(() => toast(t('saved')))}>Copy</Button>
            <Button size="sm" variant="outline" onClick={() => setDone(null)}>{t('close')}</Button>
          </div>
        </Card>
      )}

      <Card className="divide-y divide-gray-100 !p-0">
        {farms.map((r) => (
          <div key={r.farm_id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="font-bold">{r.farm_name} <Badge tone={r.status === 'active' ? 'green' : 'red'}>{r.status}</Badge></div>
              <div className="text-xs text-gray-600">
                {r.user_count} users · {r.animal_count} animals · {r.customer_count} customers · created {fmtDate(r.created_at.slice(0, 10))}
                {r.last_activity ? ` · last activity ${fmtDate(r.last_activity.slice(0, 10))}` : ''}
              </div>
            </div>
            <Button size="sm" variant={r.status === 'active' ? 'outline' : 'primary'} onClick={() => setStatus(r)}>
              {r.status === 'active' ? 'Suspend' : 'Reactivate'}
            </Button>
          </div>
        ))}
        {!farms.length && <div className="p-4 text-center text-gray-500">{t('noData')}</div>}
      </Card>

      <AddFarmModal open={adding} onClose={() => setAdding(false)} onCreated={(l) => { setDone(l); qc.invalidateQueries({ queryKey: ['platform-farms'] }) }} />
    </div>
  )
}
