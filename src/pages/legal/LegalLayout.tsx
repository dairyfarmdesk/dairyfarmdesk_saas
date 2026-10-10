import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

// Single place to edit public contact details used on all public pages.
export const CONTACT_EMAIL = 'dairyfarmdesk@gmail.com'
export const APP_NAME = 'DairyFarmDesk'
export const LAST_UPDATED = '9 October 2026'

export const PUBLIC_LINKS = [
  { to: '/about', label: 'About' },
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms of Service' },
  { to: '/delete-account', label: 'Delete Account & Data' },
  { to: '/support', label: 'Support' },
]

export function PublicFooter({ light }: { light?: boolean }) {
  return (
    <nav className={`flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs font-semibold ${light ? 'text-white/80' : 'text-gray-500'}`}>
      {PUBLIC_LINKS.map((l) => (
        <Link key={l.to} to={l.to} className="underline-offset-2 hover:underline">{l.label}</Link>
      ))}
    </nav>
  )
}

export default function LegalLayout({ title, updated = true, children }: { title: string; updated?: boolean; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand-700 px-4 py-4 text-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link to="/about" className="flex items-center gap-3">
            <img src="/favicon.svg" alt={`${APP_NAME} logo`} className="h-10 w-10 rounded-xl" />
            <span className="text-lg font-extrabold">{APP_NAME}</span>
          </Link>
          <Link to="/login" className="ml-auto rounded-xl bg-white/15 px-3 py-1.5 text-sm font-bold hover:bg-white/25">Sign in</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-extrabold [&_h2]:text-gray-900 [&_li]:mb-1 [&_p]:mb-3 [&_p]:leading-relaxed [&_p]:text-gray-700 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-gray-700 [&_a]:font-semibold [&_a]:text-brand-700 [&_a]:underline">
          <h1 className="text-2xl font-extrabold text-gray-900">{title}</h1>
          {updated && <p className="!mb-4 mt-1 text-sm !text-gray-500">Last updated: {LAST_UPDATED}</p>}
          {children}
        </article>
      </main>
      <footer className="space-y-2 px-4 pb-10 text-center">
        <PublicFooter />
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} {APP_NAME}</p>
      </footer>
    </div>
  )
}
