// Edge Function: admin-only user management (create manager, reset password, activate/deactivate).
// Uses the service role key that Supabase injects automatically. Never expose that key in the frontend.
// Multi-farm: a farm admin can only manage users of THEIR OWN farm. The service role bypasses Row Level Security,
// so every action below checks the target user's farm explicitly.
// Deploy order: run migration 0009 first, then deploy this function.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const body = await req.json()
    // "stg" = the staging copy of the database, "public" = production. Anything else is production.
    const schema = body.schema === 'stg' ? 'stg' : 'public'
    const url = Deno.env.get('SUPABASE_URL')!
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema } })
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: u } = await admin.auth.getUser(token)
    if (!u.user) return json({ error: 'Not signed in' }, 401)
    const { data: me } = await admin.from('profiles').select('role,active,farm_id').eq('id', u.user.id).maybeSingle()
    if (!me || me.role !== 'admin' || !me.active) return json({ error: 'Admin only' }, 403)
    const farmId = me.farm_id as string

    // The farm must be active (a suspended farm is read-only)
    const { data: farm } = await admin.from('farms').select('status').eq('id', farmId).maybeSingle()
    if (!farm || farm.status !== 'active') return json({ error: 'This farm is suspended' }, 403)

    // Returns the target profile only if it belongs to the caller's farm
    const mine = async (id: string) => {
      const { data } = await admin.from('profiles').select('id,role').eq('id', id).eq('farm_id', farmId).maybeSingle()
      return data
    }

    if (body.action === 'create') {
      const { email, password, full_name, phone } = body
      if (!email || !password || String(password).length < 6) return json({ error: 'Email and password (min 6 chars) required' }, 400)
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
      if (error) return json({ error: error.message }, 400)
      const { error: pe } = await admin.from('profiles').insert({ id: data.user!.id, email, full_name: full_name || '', phone: phone || null, role: 'manager', active: true, created_by: u.user.id, farm_id: farmId })
      if (pe) {
        await admin.auth.admin.deleteUser(data.user!.id)   // do not leave a login without a profile
        return json({ error: pe.message }, 400)
      }
      return json({ ok: true, id: data.user!.id })
    }
    if (body.action === 'reset_password') {
      const target = await mine(body.id)
      if (!target) return json({ error: 'User not found in your farm' }, 404)
      if (target.role !== 'manager') return json({ error: 'Only manager passwords can be reset here' }, 403)
      if (!body.password || String(body.password).length < 6) return json({ error: 'Password (min 6 chars) required' }, 400)
      const { error } = await admin.auth.admin.updateUserById(body.id, { password: body.password })
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }
    if (body.action === 'set_active') {
      if (body.id === u.user.id) return json({ error: 'You cannot deactivate yourself' }, 400)
      const target = await mine(body.id)
      if (!target) return json({ error: 'User not found in your farm' }, 404)
      await admin.from('profiles').update({ active: !!body.active }).eq('id', body.id).eq('farm_id', farmId)
      await admin.auth.admin.updateUserById(body.id, { ban_duration: body.active ? 'none' : '876000h' })
      return json({ ok: true })
    }
    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500)
  }
})
