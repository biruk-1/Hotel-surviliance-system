import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './useAuth'

const SOCKET_PATH = '/socket.io'

/**
 * Connects to the backend Socket.io server (JWT in handshake) and listens for `new_alert`.
 * Server rooms: police/admin receive all alerts; hotel users receive alerts for assigned properties.
 *
 * @param {{ enabled?: boolean; onNewAlert: (alert: Record<string, unknown>) => void }} options
 */
export function useNewAlertSocket({ enabled = true, onNewAlert }) {
  const { token, user, isAuthenticated } = useAuth()
  const handlerRef = useRef(onNewAlert)
  handlerRef.current = onNewAlert

  useEffect(() => {
    if (!enabled || !isAuthenticated || !token || !user) return
    if (!['police', 'admin', 'hotel'].includes(user.role)) return

    const baseUrl = import.meta.env.VITE_SOCKET_URL || undefined
    const socket = io(baseUrl, {
      path: SOCKET_PATH,
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socket.on('connect_error', (err) => {
      console.warn('[socket]', err?.message ?? err)
    })

    socket.on('new_alert', (payload) => {
      const alert = payload?.alert
      if (alert && typeof alert === 'object') {
        handlerRef.current?.(alert)
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [enabled, isAuthenticated, token, user?.id, user?.role])
}
