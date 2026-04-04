import { useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function RealtimeAlertToast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined
    const t = window.setTimeout(onDismiss, 8000)
    return () => window.clearTimeout(t)
  }, [toast, onDismiss])

  if (!toast) return null

  return (
    <div
      className={cn(
        'fixed bottom-5 right-5 z-50 flex items-start gap-3 w-80',
        'rounded-lg border border-amber-200 bg-white shadow-dialog',
        'p-4',
        'animate-in slide-in-from-bottom-3 fade-in-0 duration-200',
      )}
      role="status"
      aria-live="polite"
    >
      {/* Icon */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-50 border border-amber-200">
        <Bell className="h-4 w-4 text-amber-600" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-600 mb-0.5">
          New Alert
        </p>
        <p className="text-sm font-semibold text-foreground leading-snug">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
            {toast.message}
          </p>
        )}
      </div>

      {/* Dismiss */}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition-colors mt-0.5"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
