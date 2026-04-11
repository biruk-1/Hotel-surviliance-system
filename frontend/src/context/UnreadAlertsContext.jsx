import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useAuth } from '../hooks/useAuth'
import { useHotelScope } from '../hooks/useHotelScope'
import { useNewAlertSocket } from '../hooks/useNewAlertSocket'
import { getUnreadAlertCount } from '../services/alertService'

const UnreadAlertsContext = createContext({
  count: 0,
  refresh: async () => {},
  /** Hotel portal only: last realtime alert for toast + list sync */
  hotelRealtimeAlert: null,
  consumeHotelRealtimeAlert: () => {},
  /** Police/admin: increments on each `new_alert` for alerts list refresh */
  policeAlertsListBump: 0,
})

const POLL_MS = 25_000

function HotelUnreadAlertsProvider({ children }) {
  const { isAuthenticated, user } = useAuth()
  const { selectedHotelId, loading, error, hotels } = useHotelScope()
  const [count, setCount] = useState(0)
  const [hotelRealtimeAlert, setHotelRealtimeAlert] = useState(null)

  const consumeHotelRealtimeAlert = useCallback(() => {
    setHotelRealtimeAlert(null)
  }, [])

  const refresh = useCallback(async () => {
    if (!selectedHotelId || loading || error || hotels.length === 0) {
      setCount(0)
      return
    }
    try {
      const data = await getUnreadAlertCount({ hotelId: selectedHotelId })
      setCount(typeof data?.count === 'number' ? data.count : 0)
    } catch {
      /* keep previous count */
    }
  }, [selectedHotelId, loading, error, hotels.length])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'hotel') return
    const t = setInterval(refresh, POLL_MS)
    return () => clearInterval(t)
  }, [isAuthenticated, user?.role, refresh])

  useNewAlertSocket({
    enabled: Boolean(
      isAuthenticated && user?.role === 'hotel' && selectedHotelId && hotels.length > 0,
    ),
    onNewAlert: (alert) => {
      refresh()
      if (alert && typeof alert === 'object') {
        setHotelRealtimeAlert(alert)
      }
    },
  })

  const value = useMemo(
    () => ({
      count,
      refresh,
      hotelRealtimeAlert,
      consumeHotelRealtimeAlert,
      policeAlertsListBump: 0,
    }),
    [count, refresh, hotelRealtimeAlert, consumeHotelRealtimeAlert],
  )
  return (
    <UnreadAlertsContext.Provider value={value}>{children}</UnreadAlertsContext.Provider>
  )
}

function GlobalUnreadAlertsProvider({ children }) {
  const { isAuthenticated, user } = useAuth()
  const [count, setCount] = useState(0)
  const [policeAlertsListBump, setPoliceAlertsListBump] = useState(0)

  const refresh = useCallback(async () => {
    if (!['police', 'admin'].includes(user?.role)) {
      setCount(0)
      return
    }
    try {
      const data = await getUnreadAlertCount()
      setCount(typeof data?.count === 'number' ? data.count : 0)
    } catch {
      /* keep previous count */
    }
  }, [user?.role])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!isAuthenticated || !['police', 'admin'].includes(user?.role)) return
    const t = setInterval(refresh, POLL_MS)
    return () => clearInterval(t)
  }, [isAuthenticated, user?.role, refresh])

  useNewAlertSocket({
    enabled: Boolean(isAuthenticated && ['police', 'admin'].includes(user?.role)),
    onNewAlert: () => {
      refresh()
      setPoliceAlertsListBump((n) => n + 1)
    },
  })

  const noopConsume = useCallback(() => {}, [])

  const value = useMemo(
    () => ({
      count,
      refresh,
      hotelRealtimeAlert: null,
      consumeHotelRealtimeAlert: noopConsume,
      policeAlertsListBump,
    }),
    [count, refresh, noopConsume, policeAlertsListBump],
  )
  return (
    <UnreadAlertsContext.Provider value={value}>{children}</UnreadAlertsContext.Provider>
  )
}

/**
 * @param {{ portal: 'hotel' | 'police' | 'admin'; children: import('react').ReactNode }} props
 */
export function UnreadAlertsProvider({ portal, children }) {
  if (portal === 'hotel') {
    return <HotelUnreadAlertsProvider>{children}</HotelUnreadAlertsProvider>
  }
  return <GlobalUnreadAlertsProvider>{children}</GlobalUnreadAlertsProvider>
}

export function useUnreadAlerts() {
  return useContext(UnreadAlertsContext)
}
