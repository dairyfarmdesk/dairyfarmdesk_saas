// Edge Function: platform-owner-only. Creates one farm for an invited customer: the farm, its settings, and the owner's
// admin login (email + temporary password that YOU hand over). There is no public signup.
// Only emails listed in the platform_admins table may call it. Deploy after migration 0009.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const body = await req.json()
    const schema = body.schema === 'stg' ? 'stg' : 'public'
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema } })
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: u } = await admin.auth.getUser(token)
    const callerEmail = u.user?.email?.toLowerCase()
    if (!u.user || !callerEmail) return json({ error: 'Not signed in' }, 401)
    const { data: owner } = await admin.from('platform_admins').select('email').ilike('email', callerEmail).maybeSingle()
    if (!owner) return json({ error: 'Platform owner only' }, 403)

    // Forgotten password help: list a farm's logins, or set a new password for one of them.
    // (Passwords are stored hashed, so an existing password can never be read back - only replaced.)
    if (body.action === 'list_users') {
      const { data, error } = await admin.from('profiles').select('id,email,full_name,role,active').eq('farm_id', String(body.farm_id || '')).order('role')
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true, users: data })
    }
    if (body.action === 'reset_password') {
      const pw = String(body.password || '')
      if (pw.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400)
      const { data: target } = await admin.from('profiles').select('id').eq('id', String(body.user_id || '')).eq('farm_id', String(body.farm_id || '')).maybeSingle()
      if (!target) return json({ error: 'User not found in this farm' }, 404)
      const { error } = await admin.auth.admin.updateUserById(target.id, { password: pw })
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    const farm = String(body.farm_name || '').trim()
    const email = String(body.owner_email || '').trim().toLowerCase()
    const password = String(body.password || '')
    const name = String(body.owner_name || '').trim()
    if (!farm) return json({ error: 'Farm name is required' }, 400)
    if (!EMAIL.test(email)) return json({ error: 'A valid owner email is required' }, 400)
    if (password.length < 8) return json({ error: 'Temporary password must be at least 8 characters' }, 400)

    const { data: created, error: ce } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (ce) return json({ error: ce.message }, 400)

    const { data: farmId, error: fe } = await admin.rpc('platform_create_farm', {
      p_name: farm, p_owner: created.user!.id, p_owner_name: name, p_email: email, p_phone: String(body.owner_phone || ''),
    })
    if (fe) {
      await admin.auth.admin.deleteUser(created.user!.id)   // roll back: no login without a farm
      return json({ error: fe.message }, 400)
    }
    return json({ ok: true, farm_id: farmId, owner_id: created.user!.id })
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500)
  }
})
