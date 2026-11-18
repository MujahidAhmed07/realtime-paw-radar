import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '../../lib/cn'

type ToastKind = 'success' | 'error' | 'info'
interface ToastItem { id: number; kind: ToastKind; title: string; body?: string }

const ToastContext = createContext<{ push: (kind: ToastKind, title: string, body?: string) => void }>({ push: () => {} })
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const push = useCallback((kind: ToastKind, title: string, body?: string) => {
    const id = Date.now() + Math.random()
    setItems(prev => [...prev, { id, kind, title, body }])
    setTimeout(() => setItems(prev => prev.filter(t => t.id !== id)), 5000)
  }, [])
  const remove = (id: number) => setItems(prev => prev.filter(t => t.id !== id))
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[2000] flex w-80 flex-col gap-2" aria-live="polite">
        {items.map(t => (
          <div key={t.id}
            className={cn('pointer-events-auto animate-slide-in rounded-xl border bg-card p-3 shadow-card-hover dark:bg-dark-card flex items-start gap-2',
              t.kind === 'success' && 'border-success-600/30', t.kind === 'error' && 'border-destructive-600/30', t.kind === 'info' && 'border-secondary-600/30')}>
            {t.kind === 'success' && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success-600" />}
            {t.kind === 'error' && <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive-600" />}
            {t.kind === 'info' && <Info className="mt-0.5 h-5 w-5 shrink-0 text-secondary-600" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.body && <p className="mt-0.5 break-words text-xs text-muted-foreground">{t.body}</p>}
            </div>
            <button onClick={() => remove(t.id)} aria-label="Dismiss" className="rounded p-1 hover:bg-muted dark:hover:bg-dark-border">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
