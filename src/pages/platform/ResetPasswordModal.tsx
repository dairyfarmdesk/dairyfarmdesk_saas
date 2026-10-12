import { useEffect, useState } from 'react'
import { supabase, DB_SCHEMA } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { Badge, Button, Field, Input, Modal } from '@/components/ui'

interface FarmUser { id: string; email: string; full_name: string; role: 'admin' | 'manager'; active: boolean }

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('create-farm', { body: { ...body, schema: DB_SCHEMA } })
  if (error) {
    let msg = error.message
    try { msg = (await (error as any).context.json()).error || msg } catch { /* ignore */ }
    throw new Error(msg)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

const randomPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const a = crypto.getRandomValues(new Uint32Array(12))
  return Array.from(a, (n) => chars[n % chars.length]).join('')
}

/** Platform owner: pick a login of a farm and set a new password (the old one cannot be shown - it is stored hashed). */
export default function ResetPasswordModal({ farm, onClose }: { farm: { id: string; name: string } | null; onClose: () => void }) {
  const toast = useToast()
  const [users, setUsers] = useState<FarmUser[]>([])
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState(randomPassword())
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState('')
  const [err, setErr] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)

  useEffect(() => {
    if (!farm) return
    setUsers([]); setUserId(''); setDone(''); setPassword(randomPassword()); setErr(''); setLoadingUsers(true)
    call({ action: 'list_users', farm_id: farm.id })
      .then((d) => {
        if (!Array.isArray(d?.users)) throw new Error('The create-farm function is outdated. Deploy it again: supabase functions deploy create-farm')
        setUsers(d.users)
        setUserId(d.users.find((u: FarmUser) => u.role === 'admin')?.id || d.users[0]?.id || '')
        if (!d.users.length) setErr('This farm has no users.')
      })
      .catch((e) => setErr(e.message || 'Could not load users'))
      .finally(() => setLoadingUsers(false))
  }, [farm?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const user = users.find((u) => u.id === userId)
  const text = user && farm ? `Farm: ${farm.name}\nSign in: ${window.location.origin}/login\nEmail: ${user.email}\nNew password: ${password}\nPlease change the password after signing in.` : ''

  const submit = async () => {
    if (!farm) return
    setBusy(true)
    try {
      await call({ action: 'reset_password', farm_id: farm.id, user_id: userId, password })
      setDone(text)
    } catch (e: any) {
      toast(e.message, 'err')
    }
    setBusy(false)
  }

  return (
    <Modal open={!!farm} onClose={onClose} title={`Reset password · ${farm?.name ?? ''}`}>
      <div className="grid gap-3">
        {done ? (
          <>
            <div className="font-bold text-green-800">Password changed. Send these details to the user (shown only now):</div>
            <pre className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm">{done}</pre>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => navigator.clipboard.writeText(done).then(() => toast('Copied'))}>Copy</Button>
              <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-gray-600">An existing password cannot be viewed (it is stored encrypted). Set a new one and send it to the user.</p>
            {loadingUsers && <div className="text-sm text-gray-500">Loading users…</div>}
            {err && <div className="rounded-lg bg-red-50 p-2 text-sm font-semibold text-red-700">{err}</div>}
            <Field label="User">
              <select className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2" value={userId} onChange={(e) => setUserId(e.target.value)}>
                {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email} · {u.email} · {u.role}{u.active ? '' : ' (inactive)'}</option>)}
              </select>
            </Field>
            {user && <div className="text-xs"><Badge tone={user.role === 'admin' ? 'amber' : 'gray'}>{user.role}</Badge> {user.email}</div>}
            <Field label="New password (min 8)">
              <div className="flex gap-2">
                <Input value={password} onChange={(e) => setPassword(e.target.value)} />
                <Button variant="outline" onClick={() => setPassword(randomPassword())}>New</Button>
              </div>
            </Field>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button className="flex-1" disabled={busy || !userId || password.length < 8} onClick={submit}>{busy ? 'Saving…' : 'Set password'}</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
