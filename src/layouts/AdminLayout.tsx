import { NavLink, Outlet, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, PawPrint, Milk, Users, Receipt, HeartPulse, HardHat, Banknote, FileBarChart, Settings, ScrollText, LogOut, Smartphone, Building2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { LangToggle, SyncStatus } from '@/components/Status'
import { PublicFooter } from '@/pages/legal/LegalLayout'

export default function AdminLayout() {
  const { t } = useTranslation()
  const { settings, profile, signOut, isPlatformAdmin } = useAuth()
  const items = [
    { to: '/admin', icon: LayoutDashboard, label: t('nav.dashboard'), end: true },
    { to: '/admin/animals', icon: PawPrint, label: t('nav.animals') },
    { to: '/admin/milk', icon: Milk, label: t('nav.milk') },
    { to: '/admin/sales', icon: Users, label: t('nav.sales') },
    { to: '/admin/expenses', icon: Receipt, label: t('nav.expenses') },
    { to: '/admin/health', icon: HeartPulse, label: t('nav.health') },
    { to: '/admin/labour', icon: HardHat, label: t('nav.labour') },
    { to: '/admin/cash', icon: Banknote, label: t('nav.cash') },
    { to: '/admin/reports', icon: FileBarChart, label: t('nav.reports') },
    { to: '/admin/settings', icon: Settings, label: t('nav.settings') },
    { to: '/admin/audit', icon: ScrollText, label: t('nav.audit') },
  ]
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-brand-900 text-white lg:flex">
        <div className="flex items-center gap-2 p-4">
          <img src={settings?.logo_url || '/favicon.svg'} className="h-9 w-9 rounded-lg bg-white object-contain" alt="" />
          <div className="min-w-0">
            <div className="truncate font-extrabold">{settings?.farm_name || t('app')}</div>
            <div className="text-xs text-brand-200">DairyFarmDesk</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-2">
          {items.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              end={i.end}
              className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${isActive ? 'bg-white text-brand-900' : 'text-brand-100 hover:bg-brand-800'}`}
            >
              <i.icon className="h-5 w-5" /> {i.label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 p-3">
          <Link to="/m" className="flex items-center gap-2 rounded-xl bg-brand-800 px-3 py-2 text-sm font-semibold"><Smartphone className="h-4 w-4" /> {t('nav.managerApp')}</Link>
          {isPlatformAdmin && <Link to="/platform" className="flex items-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-white"><Building2 className="h-4 w-4" /> Platform</Link>}
          <button onClick={signOut} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-brand-100 hover:bg-brand-800"><LogOut className="h-4 w-4" /> {t('logout')}</button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-2">
          <div className="flex-1 font-bold text-brand-900 lg:hidden">{settings?.farm_name || t('app')}</div>
          <div className="hidden flex-1 text-sm text-gray-500 lg:block">{profile?.full_name} · {t('nav.adminConsole')}</div>
          {/* phone / app: the sidebar is hidden, so the role switch lives in the top bar */}
          <Link to="/m" className="flex items-center gap-1 rounded-full bg-brand-700 px-3 py-2 text-xs font-bold text-white lg:hidden"><Smartphone className="h-4 w-4" /> {t('nav.managerApp')}</Link>
          {isPlatformAdmin && <Link to="/platform" className="flex items-center gap-1 rounded-full bg-amber-500 px-3 py-2 text-xs font-bold text-white lg:hidden"><Building2 className="h-4 w-4" /> Platform</Link>}
          <SyncStatus />
          <LangToggle />
        </header>
        {/* mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white p-1 lg:hidden">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${isActive ? 'bg-brand-700 text-white' : 'text-gray-700'}`}>
              <i.icon className="h-4 w-4" /> {i.label}
            </NavLink>
          ))}
          <button onClick={signOut} className="shrink-0 px-3 text-xs font-bold text-red-600">{t('logout')}</button>
        </nav>
        <main className="p-3 sm:p-4 lg:p-6"><Outlet /><div className="mt-8"><PublicFooter /></div></main>
      </div>
    </div>
  )
}
