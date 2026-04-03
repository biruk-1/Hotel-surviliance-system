import { useEffect, useState } from 'react'
import { useHotelScope } from '../../hooks/useHotelScope'
import { getHotelStats } from '../../services/hotelService'
import { getApiErrorMessage } from '../../utils/apiError'
import './hotel-pages.css'

export default function HotelDashboardPage() {
  const { loading: scopeLoading, error: scopeError, hotels, selectedHotelId } = useHotelScope()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (scopeLoading || scopeError || hotels.length === 0 || !selectedHotelId) {
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      setError(null)
      setLoading(true)
      try {
        const data = await getHotelStats(selectedHotelId)
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
  }, [scopeLoading, scopeError, hotels.length, selectedHotelId])

  if (scopeLoading) {
    return <p className="hotel-page-hint">Loading properties…</p>
  }

  if (scopeError) {
    return (
      <div className="hotel-page-msg hotel-page-msg--error" role="alert">
        {getApiErrorMessage(scopeError, 'Could not load properties')}
      </div>
    )
  }

  if (hotels.length === 0) {
    return (
      <p className="hotel-page-msg" role="status">
        No property is assigned to your account. Contact an administrator.
      </p>
    )
  }

  if (loading) {
    return (
      <div className="hotel-page" role="status">
        <p className="hotel-page-hint">Loading metrics…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="hotel-page-msg hotel-page-msg--error" role="alert">
        {getApiErrorMessage(error, 'Could not load dashboard')}
      </div>
    )
  }

  return (
    <div className="hotel-page">
      <div className="hotel-stat-grid">
        <article className="hotel-stat-card">
          <h3 className="hotel-stat-card__label">Guests (at property)</h3>
          <p className="hotel-stat-card__value">{stats?.totalGuests ?? '—'}</p>
        </article>
        <article className="hotel-stat-card">
          <h3 className="hotel-stat-card__label">Active stays</h3>
          <p className="hotel-stat-card__value">{stats?.activeStays ?? '—'}</p>
        </article>
        <article className="hotel-stat-card">
          <h3 className="hotel-stat-card__label">Pending alerts</h3>
          <p className="hotel-stat-card__value">{stats?.pendingAlerts ?? '—'}</p>
          <p className="hotel-stat-card__hint">Not yet reviewed</p>
        </article>
      </div>
    </div>
  )
}
