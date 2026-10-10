import { useState } from 'react'
import { supabase, DB_SCHEMA } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { Button, Field, Input, Modal } from '@/components/ui'

export interface NewFarmLogin { farm: string; email: string; password: string }

async function createFarm(body: Record<string, unknown>) {
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

const empty = () => ({ farm_name: '', owner_name: '', owner_email: '', owner_phone: '', password: randomPassword() })

/** "Add farm" dialog for the platform owner (invite-only: you create the farm and hand over the login). */
export default function AddFarmModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (l: NewFarmLogin) => void }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [f, setF] = useState(empty())

  const submit = async () => {
    setBusy(true)
    try {
      await createFarm(f)
      onCreated({ farm: f.farm_name, email: f.owner_email.trim().toLowerCase(), password: f.password })
      setF(empty())
      onClose()
    } catch (e: any) {
      toast(e.message, 'err')
    }
    setBusy(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Add farm">
      <div className="grid gap-3">
        <Field label="Farm name"><Input value={f.farm_name} onChange={(e) => setF({ ...f, farm_name: e.target.value })} /></Field>
        <Field label="Owner name"><Input value={f.owner_name} onChange={(e) => setF({ ...f, owner_name: e.target.value })} /></Field>
        <Field label="Owner email (login)"><Input type="email" value={f.owner_email} onChange={(e) => setF({ ...f, owner_email: e.target.value })} /></Field>
        <Field label="Owner phone"><Input type="tel" value={f.owner_phone} onChange={(e) => setF({ ...f, owner_phone: e.target.value })} /></Field>
        <Field label="Temporary password (min 8)">
          <div className="flex gap-2">
            <Input value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
            <Button variant="outline" onClick={() => setF({ ...f, password: randomPassword() })}>New</Button>
          </div>
        </Field>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" disabled={busy || !f.farm_name.trim() || !f.owner_email.trim() || f.password.length < 8} onClick={submit}>
            {busy ? 'Creating…' : 'Create farm'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
