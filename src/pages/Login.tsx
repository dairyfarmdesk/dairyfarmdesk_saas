import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'
import { supabase, configured } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Button, Field, Input } from '@/components/ui'
import { LangToggle } from '@/components/Status'
import { PublicFooter } from '@/pages/legal/LegalLayout'

export default function Login() {
  const { t } = useTranslation()
  const { session, profile, isAdmin, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  if (!loading && session && profile) return <Navigate to={isAdmin ? '/admin' : '/m'} replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) setErr(error.message)
    setBusy(false)
  }

  return (
    <div className="flex min-h-screen flex-col bg-brand-700">
      <div className="flex justify-end p-4"><LangToggle light /></div>
      <div className="flex flex-1 flex-col items-center justify-center px-5">
        <img src="/favicon.svg" className="mb-3 h-28 w-28 rounded-3xl shadow-xl" alt="DairyFarmDesk logo" />
        <h1 className="mb-6 text-center text-3xl font-extrabold text-white">{t('app')}</h1>
        <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
          {!configured && <p className="rounded-lg bg-amber-100 p-2 text-sm text-amber-900">Supabase env vars are missing (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).</p>}
          <Field label={t('email')}><Input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label={t('password')}><Input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          {err && <p className="text-sm font-semibold text-red-600">{err}</p>}
          {session && !loading && !profile && <p className="text-sm font-semibold text-red-600">No profile/role found for this user. Ask the admin to set up your account.</p>}
          <Button size="lg" className="w-full" disabled={busy}>{busy ? t('loading') : t('signin')}</Button>
        </form>
        <div className="mt-6"><PublicFooter light /></div>
      </div>
    </div>
  )
}
