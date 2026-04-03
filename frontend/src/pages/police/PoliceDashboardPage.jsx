import { useCallback, useEffect, useState } from 'react'
import RealtimeAlertToast from '../../components/alerts/RealtimeAlertToast'
import InlineSpinner from '../../components/common/InlineSpinner'
import { useNewAlertSocket } from '../../hooks/useNewAlertSocket'
import { getPoliceDashboardStats } from '../../services/policeService'
import { getApiErrorMessage } from '../../utils/apiError'
import './police-pages.css'

export default function PoliceDashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError(null)
      setLoading(true)
      try {
        const data = await getPoliceDashboardStats()
        if (!cancelled) setStats(data)
      } catch (e) {
        if (!cancelled) setError(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const refreshStatsQuiet = useCallback(async () => {
    try {
      const data = await getPoliceDashboardStats()
      setStats(data)
    } catch {
      /* background refresh */
    }
  }, [])

  useNewAlertSocket({
    enabled: true,
    onNewAlert: (alert) => {
      setToast({
        title: typeof alert.title === 'string' ? alert.title : 'New alert',
        message: typeof alert.message === 'string' ? alert.message : undefined,
      })
      refreshStatsQuiet()
    },
  })

  const dismissToast = useCallback(() => setToast(null), [])

  let body
  if (loading) {
    body = (
      <p className="hotel-page-hint hotel-page-hint--inline" role="status">
        <InlineSpinner size="sm" label="Loading dashboard" />
        Loading dashboard…
      </p>
    )
  } else if (error) {
    body = (
      <div className="hotel-page-msg hotel-page-msg--error" role="alert">
        {getApiErrorMessage(error, 'Could not load dashboard')}
      </div>
    )
  } else {
    body = (
      <div className="hotel-stat-grid">
        <article className="hotel-stat-card">
          <h3 className="hotel-stat-card__label">Total guests</h3>
          <p className="hotel-stat-card__value">{stats?.totalGuests ?? '—'}</p>
        </article>
        <article className="hotel-stat-card">
          <h3 className="hotel-stat-card__label">Alerts today</h3>
          <p className="hotel-stat-card__value">{stats?.alertsToday ?? '—'}</p>
          <p className="hotel-stat-card__hint">Server local day</p>
        </article>
        <article className="hotel-stat-card">
          <h3 className="hotel-stat-card__label">Blacklist entries</h3>
          <p className="hotel-stat-card__value">{stats?.blacklistCount ?? '—'}</p>
        </article>
      </div>
    )
  }

  return (
    <div className="hotel-page">
      <RealtimeAlertToast toast={toast} onDismiss={dismissToast} />
      {body}
    </div>
  )
}
