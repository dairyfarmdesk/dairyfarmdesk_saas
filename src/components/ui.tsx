import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'danger' | 'ghost'
  size?: 'md' | 'lg' | 'sm'
}
export function Button({ variant = 'primary', size = 'md', className, ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition active:scale-[0.98] disabled:opacity-50',
        size === 'lg' ? 'h-16 px-6 text-xl' : size === 'sm' ? 'h-9 px-3 text-sm' : 'h-12 px-5 text-base',
        variant === 'primary' && 'bg-brand-700 text-white hover:bg-brand-800',
        variant === 'outline' && 'border-2 border-brand-700 bg-white text-brand-800 hover:bg-brand-50',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
        variant === 'ghost' && 'text-gray-700 hover:bg-gray-100',
        className,
      )}
    />
  )
}

const field = 'w-full rounded-xl border-2 border-gray-300 bg-white px-3 text-gray-900 focus:border-brand-600 focus:outline-none'

export function Input({ className, big, ...p }: InputHTMLAttributes<HTMLInputElement> & { big?: boolean }) {
  return <input {...p} className={cn(field, big ? 'h-16 text-2xl font-bold' : 'h-12', className)} />
}
export function Select({ className, big, ...p }: SelectHTMLAttributes<HTMLSelectElement> & { big?: boolean }) {
  return <select {...p} className={cn(field, big ? 'h-16 text-xl font-semibold' : 'h-12', className)} />
}
export function Textarea({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cn(field, 'py-2', className)} rows={2} />
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1 block text-sm font-bold text-gray-700">{label}</span>
      {children}
    </label>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-2xl border border-gray-200 bg-white p-4 shadow-sm', className)}>{children}</div>
}

export function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: 'gray' | 'green' | 'red' | 'amber' }) {
  const c = { gray: 'bg-gray-100 text-gray-800', green: 'bg-green-100 text-green-800', red: 'bg-red-100 text-red-800', amber: 'bg-amber-100 text-amber-800' }[tone]
  return <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-xs font-bold', c)}>{children}</span>
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { v: T; label: string }[] }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-2xl bg-gray-200 p-1">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={cn('h-12 min-w-fit flex-1 whitespace-nowrap rounded-xl px-3 text-base font-bold', value === o.v ? 'bg-brand-700 text-white shadow' : 'text-gray-700')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 sm:max-w-xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-brand-900">{title}</h2>
          <button onClick={onClose} className="h-10 w-10 rounded-full text-2xl text-gray-500 hover:bg-gray-100" aria-label="close">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Spinner() {
  return <div className="p-8 text-center text-gray-500">…</div>
}
