import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useHotelScope } from '../../hooks/useHotelScope'
import { getGuestById, listGuests } from '../../services/guestService'
import { getApiErrorMessage } from '../../utils/apiError'
import { formatDateTime, pickStayForHotel } from '../../utils/hotel'
import './hotel-pages.css'

const PAGE_SIZE = 10

export default function GuestListPage() {
  const { loading: scopeLoading, error: scopeError, hotels, selectedHotelId } = useHotelScope()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
        const { data, pagination: pag } = await listGuests({
          hotelId: selectedHotelId,
          page,
          limit: PAGE_SIZE,
        })
        const guests = data?.guests ?? []
        const enriched = await Promise.all(
          guests.map(async (g) => {
            const detail = await getGuestById(g.id)
            const stays = detail.stays ?? []
            const stay = pickStayForHotel(stays, selectedHotelId)
            return {
              id: g.id,
              name: g.full_name ?? g.fullName ?? '—',
              idNumber: g.id_number ?? g.idNumber ?? '—',
              room: stay?.room_number ?? stay?.roomNumber ?? '—',
              checkIn: stay?.check_in ?? stay?.checkIn,
            }
          }),
        )
        if (cancelled) return
        setRows(enriched)
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
  }, [scopeLoading, scopeError, hotels.length, selectedHotelId, page])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.idNumber.toLowerCase().includes(q) ||
        String(r.id).toLowerCase().includes(q),
    )
  }, [rows, search])

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

  return (
    <div className="hotel-page">
      <div className="hotel-toolbar">
        <label className="hotel-toolbar__search">
          <span className="hotel-toolbar__search-label">Search</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, ID number, or guest UUID…"
            className="hotel-toolbar__input"
          />
        </label>
        <p className="hotel-toolbar__hint">Filters the current page of results.</p>
      </div>

      {loading ? (
        <p className="hotel-page-hint" role="status">
          Loading guests…
        </p>
      ) : null}
      {error ? (
        <div className="hotel-page-msg hotel-page-msg--error" role="alert">
          {getApiErrorMessage(error, 'Could not load guests')}
        </div>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="hotel-table-wrap">
            <table className="hotel-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>ID number</th>
                  <th>Room</th>
                  <th>Check-in</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="hotel-table__empty">
                      No guests match this view.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td>
                        <code className="hotel-code">{r.idNumber}</code>
                      </td>
                      <td>{r.room}</td>
                      <td>{formatDateTime(r.checkIn)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination && search.trim() === '' ? (
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
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
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
