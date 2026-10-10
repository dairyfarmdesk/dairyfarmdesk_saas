import { NavLink, Outlet, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Home, Milk, Users, Receipt, HeartPulse, LogOut, LayoutDashboard, PawPrint, HardHat, Banknote } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { LangToggle, SyncStatus } from '@/components/Status'
import { fmtDate, todayIST } from '@/lib/format'
import { PublicFooter } from '@/pages/legal/LegalLayout'

/**
 * Responsive manager layout:
 *  - phone (<768px): top bar + bottom navigation (5 big tabs)
 *  - tablet / laptop (>=768px): left sidebar with all pages, wider content
 */
export default function ManagerLayout() {
  const { t } = useTranslation()
  const { settings, signOut, isAdmin } = useAuth()
  const tabs = [
    { to: '/m', icon: Home, label: t('nav.home'), end: true },
    { to: '/m/milk', icon: Milk, label: t('nav.milk') },
    { to: '/m/customers', icon: Users, label: t('nav.customers') },
    { to: '/m/expenses', icon: Receipt, label: t('nav.expenses') },
    { to: '/m/health', icon: HeartPulse, label: t('nav.health') },
  ]
  const side = [
    ...tabs,
    { to: '/m/animals', icon: PawPrint, label: t('nav.animals') },
    { to: '/m/labour', icon: HardHat, label: t('nav.labour') },
    { to: '/m/cash', icon: Banknote, label: t('nav.cash') },
  ]
  const name = settings?.farm_name || t('app')
  const logo = settings?.logo_url || '/favicon.svg'

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-brand-800 text-white md:flex">
        <div className="flex items-center gap-2 p-4">
          <img src={logo} className="h-11 w-11 shrink-0 rounded-xl bg-white object-contain" alt="" />
          <div className="min-w-0"><div className="truncate font-extrabold leading-tight">{name}</div><div className="text-xs text-brand-200">{fmtDate(todayIST())}</div></div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-2">
          {side.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-base font-bold ${isActive ? 'bg-white text-brand-900' : 'text-brand-100 hover:bg-brand-700'}`}>
              <i.icon className="h-6 w-6" /> {i.label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-1 p-3">
          {isAdmin && <Link to="/admin" className="flex items-center gap-2 rounded-xl bg-brand-700 px-3 py-2 text-sm font-semibold"><LayoutDashboard className="h-4 w-4" /> {t('nav.adminConsole')}</Link>}
          <button onClick={signOut} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-brand-100 hover:bg-brand-700"><LogOut className="h-4 w-4" /> {t('logout')}</button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-2 bg-brand-700 px-3 py-2 text-white">
          <img src={logo} className="h-10 w-10 shrink-0 rounded-xl bg-white object-contain md:hidden" alt="" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-extrabold md:hidden">{name}</div>
            <div className="text-xs opacity-90 md:text-sm">{fmtDate(todayIST())}</div>
          </div>
          <SyncStatus light />
          <LangToggle light />
          {isAdmin && <Link to="/admin" className="grid h-10 w-10 place-items-center rounded-full bg-white/20 md:hidden"><LayoutDashboard className="h-5 w-5" /></Link>}
          <button onClick={signOut} className="grid h-10 w-10 place-items-center rounded-full bg-white/20 md:hidden" aria-label={t('logout')}><LogOut className="h-5 w-5" /></button>
        </header>
        <main className="mx-auto w-full max-w-xl flex-1 p-3 pb-28 md:max-w-4xl md:p-6 md:pb-8 xl:max-w-6xl"><Outlet /><div className="mt-8"><PublicFooter /></div></main>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t-2 border-brand-700 bg-white md:hidden">
        {tabs.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `flex h-[68px] flex-col items-center justify-center gap-0.5 text-[11px] font-bold sm:text-xs ${isActive ? 'bg-brand-100 text-brand-900' : 'text-gray-600'}`}>
            <i.icon className="h-7 w-7" />
            {i.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
