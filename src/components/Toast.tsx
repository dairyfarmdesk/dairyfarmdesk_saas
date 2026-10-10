import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertTriangle } from 'lucide-react'

type T = { id: number; msg: string; kind: 'ok' | 'err' | 'warn' }
const Ctx = createContext<(msg: string, kind?: T['kind']) => void>(() => {})
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<T[]>([])
  const push = useCallback((msg: string, kind: T['kind'] = 'ok') => {
    const id = Date.now() + Math.random()
    setItems((s) => [...s, { id, msg, kind }])
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), kind === 'ok' ? 2500 : 5000)
  }, [])
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-base font-semibold text-white shadow-xl ${
              t.kind === 'ok' ? 'bg-green-600' : t.kind === 'warn' ? 'bg-amber-600' : 'bg-red-600'
            }`}
          >
            {t.kind === 'ok' ? <CheckCircle2 className="h-6 w-6 shrink-0" /> : <AlertTriangle className="h-6 w-6 shrink-0" />}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
