import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { supabase, setUploadFolder } from './supabase'
import type { Profile, Settings } from './types'

interface AuthCtx {
  session: Session | null
  profile: Profile | null
  settings: Settings | null
  isAdmin: boolean
  isPlatformAdmin: boolean
  loading: boolean
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx>({} as AuthCtx)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const qc = useQueryClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (!s) qc.clear()
    })
    return () => data.subscription.unsubscribe()
  }, [qc])

  const uid = session?.user.id
  const prof = useQuery({
    queryKey: ['profile', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', uid!).maybeSingle()
      if (error) throw error
      return data as Profile | null
    },
  })
  const set = useQuery({
    queryKey: ['settings', prof.data?.farm_id ?? null],
    enabled: !!uid && prof.isFetched,
    queryFn: async () => {
      // Multi-farm: the user's own farm settings. Before migration 0009 there is no farm_id, so fall back to the single row (id = 1).
      const fid = prof.data?.farm_id
      const q = supabase.from('settings').select('*')
      const { data } = await (fid ? q.eq('farm_id', fid) : q.eq('id', 1)).maybeSingle()
      return data as Settings | null
    },
  })

  // New uploads are stored under "<farm id>/"
  useEffect(() => {
    setUploadFolder(prof.data?.farm_id)
  }, [prof.data?.farm_id])

  // Platform owner (can open /platform). The database re-checks this on every call; this only shows or hides the link.
  const plat = useQuery({
    queryKey: ['is-platform-admin', uid],
    enabled: !!uid,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_platform_admin')
      return !error && data === true
    },
  })

  const profile = prof.data ?? null
  const value: AuthCtx = {
    session,
    profile,
    settings: set.data ?? null,
    isPlatformAdmin: plat.data === true,
    isAdmin: profile?.role === 'admin' && profile.active,
    loading: !ready || (!!uid && prof.isLoading),
    signOut: async () => {
      await supabase.auth.signOut()
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
