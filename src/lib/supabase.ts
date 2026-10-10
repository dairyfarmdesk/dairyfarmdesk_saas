import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Which database schema the app talks to: "public" = production (default), "stg" = the staging copy.
// Set VITE_DB_SCHEMA=stg only on the staging deployment. Anything else falls back to production.
const wanted = (import.meta.env.VITE_DB_SCHEMA as string | undefined)?.trim()
export const DB_SCHEMA: 'public' | 'stg' = wanted === 'stg' ? 'stg' : 'public'

export const configured = Boolean(url && key)

// Only the publishable (anon) key is ever used in the browser. RLS protects the data.
export const supabase = createClient(url || 'http://localhost:54321', key || 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true },
  db: { schema: DB_SCHEMA },
})

// The signed-in user's farm; set by AuthProvider. New uploads are stored under "<farm id>/" so farms stay separate.
let farmFolder = ''
export const setUploadFolder = (farmId: string | null | undefined) => {
  farmFolder = farmId ?? ''
}

export async function uploadFile(bucket: 'animal-photos' | 'bills' | 'logo', file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg'
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const path = farmFolder ? `${farmFolder}/${name}` : name
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false })
  if (error) throw error
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}
