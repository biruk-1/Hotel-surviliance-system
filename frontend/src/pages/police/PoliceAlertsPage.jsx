import { useCallback, useEffect, useState } from 'react'
import InlineSpinner from '../../components/common/InlineSpinner'
import { listAlerts, markAlertReviewed } from '../../services/alertService'
import { getApiErrorMessage } from '../../utils/apiError'
import { formatDateTime } from '../../utils/hotel'
import './police-pages.css'

const PAGE_SIZE = 20

export default function PoliceAlertsPage() {
  const [page, setPage] = useState(1)
  const [alerts, setAlerts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionId, setActionId] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [listVersion, setListVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError(null)
      setLoading(true)
      try {
        const { data, pagination: pag } = await listAlerts({ page, limit: PAGE_SIZE })
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
  }, [page, listVersion])

  const refreshList = useCallback(() => setListVersion((v) => v + 1), [])

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

  return (
    <div className="hotel-page">
      <p className="hotel-page-lede">All alerts across properties.</p>

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
                  <th>Hotel</th>
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
                    <td colSpan={7} className="hotel-table__empty">
                      No alerts.
                    </td>
                  </tr>
                ) : (
                  alerts.map((a) => {
                    const reviewed = Boolean(a.acknowledged_at)
                    return (
                      <tr key={a.id}>
                        <td data-label="Hotel">
                          <code className="hotel-code">{a.hotel_id ?? a.hotelId ?? '—'}</code>
                        </td>
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
