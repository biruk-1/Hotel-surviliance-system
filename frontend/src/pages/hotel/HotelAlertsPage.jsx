import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import RealtimeAlertToast from '../../components/alerts/RealtimeAlertToast'
import InlineSpinner from '../../components/common/InlineSpinner'
import { useNewAlertSocket } from '../../hooks/useNewAlertSocket'
import { useHotelScope } from '../../hooks/useHotelScope'
import { listAlertsForHotel, markAlertReviewed } from '../../services/alertService'
import { getApiErrorMessage } from '../../utils/apiError'
import { formatDateTime } from '../../utils/hotel'
import './hotel-pages.css'

const PAGE_SIZE = 15

export default function HotelAlertsPage() {
  const { loading: scopeLoading, error: scopeError, hotels, selectedHotelId } = useHotelScope()
  const selectedHotelIdRef = useRef(selectedHotelId)
  selectedHotelIdRef.current = selectedHotelId

  const [page, setPage] = useState(1)
  const [listVersion, setListVersion] = useState(0)
  const [alerts, setAlerts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionId, setActionId] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [toast, setToast] = useState(null)

  useLayoutEffect(() => {
    setPage(1)
  }, [selectedHotelId])

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
        const { data, pagination: pag } = await listAlertsForHotel(selectedHotelId, {
          page,
          limit: PAGE_SIZE,
        })
        if (cancelled) return
        setAlerts(data?.alerts ?? [])
        setPagination(pag ?? null)
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
  }, [scopeLoading, scopeError, hotels.length, selectedHotelId, page, listVersion])

  const refreshList = useCallback(() => {
    setListVersion((v) => v + 1)
  }, [])

  useNewAlertSocket({
    enabled: Boolean(!scopeLoading && !scopeError && hotels.length > 0 && selectedHotelId),
    onNewAlert: (alert) => {
      setToast({
        title: typeof alert.title === 'string' ? alert.title : 'New alert',
        message: typeof alert.message === 'string' ? alert.message : undefined,
      })
      const hid = alert.hotel_id
      if (hid && selectedHotelIdRef.current && hid === selectedHotelIdRef.current) {
        setPage(1)
        setListVersion((v) => v + 1)
      }
    },
  })

  const dismissToast = useCallback(() => setToast(null), [])

  async function handleReview(alertId) {
    setActionError(null)
    setActionId(alertId)
    try {
      const payload = await markAlertReviewed(alertId)
      const next = payload?.alert
      if (next) {
        setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, ...next } : a)))
      }
    } catch (e) {
      setActionError(getApiErrorMessage(e, 'Could not update alert'))
    } finally {
      setActionId(null)
    }
  }

  if (scopeLoading) {
    return (
      <div className="hotel-page">
        <RealtimeAlertToast toast={toast} onDismiss={dismissToast} />
        <p className="hotel-page-hint hotel-page-hint--inline">
          <InlineSpinner size="sm" label="Loading properties" />
          Loading properties…
        </p>
      </div>
    )
  }

  if (scopeError) {
    return (
      <div className="hotel-page">
        <RealtimeAlertToast toast={toast} onDismiss={dismissToast} />
        <div className="hotel-page-msg hotel-page-msg--error" role="alert">
          {getApiErrorMessage(scopeError, 'Could not load properties')}
        </div>
      </div>
    )
  }

  if (hotels.length === 0) {
    return (
      <div className="hotel-page">
        <RealtimeAlertToast toast={toast} onDismiss={dismissToast} />
        <p className="hotel-page-msg" role="status">
          No property is assigned to your account. Contact an administrator.
        </p>
      </div>
    )
  }

  return (
    <div className="hotel-page">
      <RealtimeAlertToast toast={toast} onDismiss={dismissToast} />
      <p className="hotel-page-lede">Alerts for the selected property only.</p>

      {actionError ? (
        <div className="hotel-page-msg hotel-page-msg--error" role="alert">
          {actionError}
        </div>
      ) : null}

      {loading ? (
        <p className="hotel-page-hint hotel-page-hint--inline" role="status">
          <InlineSpinner size="sm" label="Loading alerts" />
          Loading alerts…
        </p>
      ) : null}
      {error ? (
        <div className="hotel-page-msg hotel-page-msg--error" role="alert">
          {getApiErrorMessage(error, 'Could not load alerts')}
          <button type="button" className="hotel-retry-btn" onClick={refreshList}>
            Retry
          </button>
        </div>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="hotel-table-wrap">
            <table className="hotel-table hotel-table--responsive">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Title</th>
                  <th>Message</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {alerts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="hotel-table__empty">
                      No alerts for this property.
                    </td>
                  </tr>
                ) : (
                  alerts.map((a) => {
                    const reviewed = Boolean(a.acknowledged_at)
                    return (
                      <tr key={a.id}>
                        <td data-label="Severity">{a.severity ?? '—'}</td>
                        <td data-label="Title">{a.title ?? '—'}</td>
                        <td data-label="Message" className="hotel-table__clamp">
                          {a.message ?? '—'}
                        </td>
                        <td data-label="Created">{formatDateTime(a.created_at)}</td>
                        <td data-label="Status">{reviewed ? 'Reviewed' : 'Pending'}</td>
                        <td data-label="Actions">
                          <button
                            type="button"
                            className="hotel-table__action"
                            disabled={reviewed || actionId === a.id}
                            onClick={() => handleReview(a.id)}
                          >
                            <span className="hotel-table__action-content">
                              {actionId === a.id ? <InlineSpinner size="sm" label="Saving alert" /> : null}
                              {actionId === a.id ? 'Saving' : reviewed ? 'Done' : 'Mark reviewed'}
                            </span>
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {pagination ? (
            <nav className="hotel-pagination" aria-label="Pagination">
              <button
                type="button"
                className="hotel-pagination__btn"
                disabled={!pagination.hasPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="hotel-pagination__meta">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                className="hotel-pagination__btn"
                disabled={!pagination.hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </nav>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
