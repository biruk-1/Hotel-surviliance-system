import { useCallback, useState } from 'react'
import { listGuests } from '../../services/guestService'
import { getApiErrorMessage } from '../../utils/apiError'
import './police-pages.css'

const PAGE_SIZE = 15

export default function PoliceGuestSearchPage() {
  const [name, setName] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [hotelId, setHotelId] = useState('')
  const [page, setPage] = useState(1)
  const [guests, setGuests] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)

  const runSearch = useCallback(
    async (pageNum) => {
      setError(null)
      setLoading(true)
      try {
        const params = {
          page: pageNum,
          limit: PAGE_SIZE,
        }
        const n = name.trim()
        const id = idNumber.trim()
        const hid = hotelId.trim()
        if (n) params.name = n
        if (id) params.idNumber = id
        if (hid) params.hotelId = hid

        const { data, pagination: pag } = await listGuests(params)
        setGuests(data?.guests ?? [])
        setPagination(pag ?? null)
        setPage(pageNum)
      } catch (e) {
        setError(e)
        setGuests([])
        setPagination(null)
      } finally {
        setLoading(false)
        setHasSearched(true)
      }
    },
    [name, idNumber, hotelId],
  )

  function handleSubmit(e) {
    e.preventDefault()
    runSearch(1)
  }

  return (
    <div className="hotel-page">
      <form className="hotel-form police-search-form" onSubmit={handleSubmit}>
        <div className="police-search-grid">
          <label className="hotel-form__field">
            <span>Name contains</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Optional"
            />
          </label>
          <label className="hotel-form__field">
            <span>ID number contains</span>
            <input
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              placeholder="Optional"
            />
          </label>
          <label className="hotel-form__field">
            <span>Hotel UUID</span>
            <input
              value={hotelId}
              onChange={(e) => setHotelId(e.target.value)}
              placeholder="Filter by property"
            />
          </label>
        </div>
        <button type="submit" className="hotel-form__submit police-search-submit" disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error ? (
        <div className="hotel-page-msg hotel-page-msg--error" role="alert">
          {getApiErrorMessage(error, 'Search failed')}
        </div>
      ) : null}

      {!hasSearched && !loading ? (
        <p className="hotel-page-hint" role="status">
          Set optional filters and click Search.
        </p>
      ) : null}

      {hasSearched && pagination ? (
        <>
          <div className="hotel-table-wrap">
            <table className="hotel-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>ID number</th>
                  <th>Guest ID</th>
                  <th>Date of birth</th>
                </tr>
              </thead>
              <tbody>
                {guests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="hotel-table__empty">
                      No guests match these filters.
                    </td>
                  </tr>
                ) : (
                  guests.map((g) => (
                    <tr key={g.id}>
                      <td>{g.full_name ?? g.fullName ?? '—'}</td>
                      <td>
                        <code className="hotel-code">{g.id_number ?? g.idNumber ?? '—'}</code>
                      </td>
                      <td>
                        <code className="hotel-code">{g.id}</code>
                      </td>
                      <td>{g.date_of_birth ?? g.dateOfBirth ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination ? (
            <nav className="hotel-pagination" aria-label="Pagination">
              <button
                type="button"
                className="hotel-pagination__btn"
                disabled={!pagination.hasPrev || loading}
                onClick={() => runSearch(page - 1)}
              >
                Previous
              </button>
              <span className="hotel-pagination__meta">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </span>
              <button
                type="button"
                className="hotel-pagination__btn"
                disabled={!pagination.hasNext || loading}
                onClick={() => runSearch(page + 1)}
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
