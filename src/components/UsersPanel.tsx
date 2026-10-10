import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase, DB_SCHEMA } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { Badge, Button, Card, Field, Input, Modal } from '@/components/ui'
import type { Profile } from '@/lib/types'

async function manage(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('create-manager', { body: { ...body, schema: DB_SCHEMA } })
  if (error) {
    let msg = error.message
    try { msg = (await (error as any).context.json()).error || msg } catch { /* ignore */ }
    throw new Error(msg)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

export default function UsersPanel() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [nu, setNu] = useState({ full_name: '', email: '', password: '', phone: '' })
  const [pwFor, setPwFor] = useState<Profile | null>(null)
  const [newPw, setNewPw] = useState('')

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await supabase.from('profiles').select('*').order('created_at')).data as Profile[],
  })

  const run = async (fn: () => Promise<unknown>, after?: () => void) => {
    try {
      await fn()
      toast(t('saved'))
      qc.invalidateQueries({ queryKey: ['users'] })
      after?.()
    } catch (e: any) {
      toast(e.message, 'err')
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-brand-900">{t('admin.managers')}</h2>
        <Button onClick={() => setAdding(true)}>+ {t('admin.addManager')}</Button>
      </div>
      <Card className="divide-y divide-gray-100 !p-0">
        {users.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
            <div className="min-w-0 flex-1"><div className="font-bold">{u.full_name || u.email}</div><div className="text-xs text-gray-600">{u.email}</div></div>
            <Badge tone={u.role === 'admin' ? 'amber' : 'green'}>{u.role}</Badge>
            {!u.active && <Badge tone="red">inactive</Badge>}
            {u.role === 'manager' && (
              <>
                <Button size="sm" variant="outline" onClick={() => setPwFor(u)}>{t('admin.resetPw')}</Button>
                <Button size="sm" variant="ghost" onClick={() => run(() => manage({ action: 'set_active', id: u.id, active: !u.active }))}>{u.active ? t('admin.deactivate') : t('admin.activate')}</Button>
              </>
            )}
          </div>
        ))}
      </Card>

      <Modal open={adding} onClose={() => setAdding(false)} title={t('admin.addManager')}>
        <div className="space-y-3">
          <Field label={t('admin.fullName')}><Input value={nu.full_name} onChange={(e) => setNu({ ...nu, full_name: e.target.value })} /></Field>
          <Field label={t('email')}><Input type="email" value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} /></Field>
          <Field label={t('phone')}><Input value={nu.phone} onChange={(e) => setNu({ ...nu, phone: e.target.value })} /></Field>
          <Field label={t('password') + ' (min 6)'}><Input type="text" value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} /></Field>
          <Button className="w-full" onClick={() => run(() => manage({ action: 'create', ...nu }), () => { setAdding(false); setNu({ full_name: '', email: '', password: '', phone: '' }) })}>{t('save')}</Button>
        </div>
      </Modal>
      <Modal open={!!pwFor} onClose={() => setPwFor(null)} title={`${t('admin.resetPw')} – ${pwFor?.full_name}`}>
        <div className="space-y-3">
          <Input type="text" placeholder={t('password')} value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          <Button className="w-full" onClick={() => run(() => manage({ action: 'reset_password', id: pwFor!.id, password: newPw }), () => { setPwFor(null); setNewPw('') })}>{t('save')}</Button>
        </div>
      </Modal>
    </>
  )
}
