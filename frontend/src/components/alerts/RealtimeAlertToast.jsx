import { useEffect } from 'react'
import './realtime-alert-toast.css'

/**
 * @param {{ toast: { title: string; message?: string } | null; onDismiss: () => void }} props
 */
export default function RealtimeAlertToast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined
    const t = window.setTimeout(onDismiss, 8000)
    return () => window.clearTimeout(t)
  }, [toast, onDismiss])

  if (!toast) return null

  return (
    <div className="rt-toast" role="status" aria-live="polite">
      <div className="rt-toast__inner">
        <p className="rt-toast__eyebrow">New alert</p>
        <p className="rt-toast__title">{toast.title}</p>
        {toast.message ? (
          <p className="rt-toast__msg">{toast.message}</p>
        ) : null}
        <button type="button" className="rt-toast__dismiss" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  )
}
