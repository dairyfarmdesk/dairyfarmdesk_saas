import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase, uploadFile } from '@/lib/supabase'
import { setLang } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/components/Toast'
import { Button, Card, Field, Input, Select } from '@/components/ui'
import UsersPanel from '@/components/UsersPanel'

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { settings } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const [s, setS] = useState({
    farm_name: settings?.farm_name ?? '', default_rate: String(settings?.default_rate ?? 55),
    manager_edit_days: String(settings?.manager_edit_days ?? 2), logo_url: settings?.logo_url ?? '',
  })

  const saveSettings = async () => {
    const { error } = await supabase.from('settings').update({
      farm_name: s.farm_name, default_rate: Number(s.default_rate) || 0, manager_edit_days: Number(s.manager_edit_days) || 0, logo_url: s.logo_url || null,
    }).eq('id', settings?.id ?? 1)
    if (error) return toast(error.message, 'err')
    toast(t('saved'))
    qc.invalidateQueries({ queryKey: ['settings'] })
  }
  const onLogo = async (f?: File) => {
    if (!f) return
    try { setS({ ...s, logo_url: await uploadFile('logo', f) }) } catch (e: any) { toast(e.message, 'err') }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-extrabold text-brand-900">{t('nav.settings')}</h1>
      <Card className="space-y-3">
        <Field label={t('admin.farmName')}><Input value={s.farm_name} onChange={(e) => setS({ ...s, farm_name: e.target.value })} /></Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('admin.defaultRate') + ' (₹/L)'}><Input type="number" value={s.default_rate} onChange={(e) => setS({ ...s, default_rate: e.target.value })} /></Field>
          <Field label={t('admin.editDays')}><Input type="number" min="0" value={s.manager_edit_days} onChange={(e) => setS({ ...s, manager_edit_days: e.target.value })} /></Field>
        </div>
        <Field label={t('admin.logo')}>
          <input type="file" accept="image/*" onChange={(e) => onLogo(e.target.files?.[0])} />
          {s.logo_url && <img src={s.logo_url} className="mt-2 h-14" alt="" />}
        </Field>
        <Field label={t('admin.language')}>
          <Select value={i18n.language} onChange={(e) => setLang(e.target.value as 'en' | 'hi')}><option value="en">English</option><option value="hi">हिन्दी</option></Select>
        </Field>
        <p className="text-sm text-gray-500">Units: Litres (L) · Currency: ₹ INR · Dates: DD-MM-YYYY · Timezone: Asia/Kolkata</p>
        <Button onClick={saveSettings}>{t('save')}</Button>
      </Card>
      <UsersPanel />
    </div>
  )
}
