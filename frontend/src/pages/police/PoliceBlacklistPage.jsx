import { useCallback, useEffect, useState } from 'react'
import {
  createBlacklistEntry,
  listBlacklist,
  removeBlacklistEntry,
} from '../../services/blacklistService'
import { getApiErrorMessage } from '../../utils/apiError'
import './police-pages.css'

const PAGE_SIZE = 20

export default function PoliceBlacklistPage() {
  const [page, setPage] = useState(1)
  const [filterInput, setFilterInput] = useState('')
  const [appliedHotelFilter, setAppliedHotelFilter] = useState('')
  const [entries, setEntries] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [formHotelId, setFormHotelId] = useState('')
  const [formName, setFormName] = useState('')
  const [formIdNumber, setFormIdNumber] = useState('')
  const [formDob, setFormDob] = useState('')
  const [formReason, setFormReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const [formSuccess, setFormSuccess] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const loadList = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const params = { page, limit: PAGE_SIZE }
      if (appliedHotelFilter) params.hotelId = appliedHotelFilter
      const { data, pagination: pag } = await listBlacklist(params)
      setEntries(data?.entries ?? [])
      setPagination(pag ?? null)
    } catch (e) {
      setError(e)
      setEntries([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }, [page, appliedHotelFilter])

  useEffect(() => {
    loadList()
  }, [loadList])

  function applyRegistryFilter() {
    setAppliedHotelFilter(filterInput.trim())
    setPage(1)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)
    if (!formHotelId.trim()) {
      setFormError('Hotel UUID is required')
      return
    }
    setSubmitting(true)
    try {
      await createBlacklistEntry({
        hotelId: formHotelId.trim(),
        name: formName.trim(),
        idNumber: formIdNumber.trim(),
        dateOfBirth: formDob,
        reason: formReason.trim() || undefined,
      })
      setFormSuccess('Entry created')
      setFormName('')
      setFormIdNumber('')
      setFormDob('')
      setFormReason('')
      await loadList()
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Could not create entry'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(entry) {
    const hid = entry.hotel_id ?? entry.hotelId
    const id = entry.id
    if (!hid || !id) return
    if (!window.confirm('Remove this blacklist entry?')) return
    setDeletingId(id)
    try {
      await removeBlacklistEntry(String(hid), String(id))
      await loadList()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not delete'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="hotel-page">
      <section className="police-bl-section">
        <h2 className="police-bl-heading">Add entry</h2>
        <form className="hotel-form police-bl-form" onSubmit={handleCreate}>
          {formError ? (
            <div className="hotel-page-msg hotel-page-msg--error" role="alert">
              {formError}
            </div>
          ) : null}
          {formSuccess ? (
            <div className="hotel-page-msg police-bl-success" role="status">
              {formSuccess}
            </div>
          ) : null}
          <div className="police-search-grid">
            <label className="hotel-form__field">
              <span>Hotel UUID</span>
              <input
                value={formHotelId}
                onChange={(e) => setFormHotelId(e.target.value)}
                required
                disabled={submitting}
                placeholder="Property ID"
              />
            </label>
            <label className="hotel-form__field">
              <span>Full name</span>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                disabled={submitting}
              />
            </label>
            <label className="hotel-form__field">
              <span>ID number</span>
              <input
                value={formIdNumber}
                onChange={(e) => setFormIdNumber(e.target.value)}
                required
                disabled={submitting}
              />
            </label>
            <label className="hotel-form__field">
              <span>Date of birth</span>
              <input
                type="date"
                value={formDob}
                onChange={(e) => setFormDob(e.target.value)}
                required
                disabled={submitting}
              />
            </label>
            <label className="hotel-form__field police-bl-span-2">
              <span>Reason (optional)</span>
              <input
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                disabled={submitting}
              />
            </label>
          </div>
          <button type="submit" className="hotel-form__submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Add to blacklist'}
          </button>
        </form>
      </section>

      <section className="police-bl-section">
        <h2 className="police-bl-heading">Registry</h2>
        <div className="police-bl-toolbar">
          <label className="hotel-form__field">
            <span>Filter by hotel UUID</span>
            <input
              value={filterInput}
              onChange={(e) => setFilterInput(e.target.value)}
              placeholder="Leave empty for all"
            />
          </label>
          <button type="button" className="hotel-pagination__btn" onClick={applyRegistryFilter}>
            Apply filter
          </button>
        </div>

        {loading ? (
          <p className="hotel-page-hint" role="status">
            Loading…
          </p>
        ) : null}
        {error ? (
          <div className="hotel-page-msg hotel-page-msg--error" role="alert">
            {getApiErrorMessage(error, 'Could not load blacklist')}
          </div>
        ) : null}

        {!loading && !error ? (
          <>
            <div className="hotel-table-wrap">
              <table className="hotel-table">
                <thead>
                  <tr>
                    <th>Hotel</th>
                    <th>Name</th>
                    <th>ID number</th>
                    <th>DOB</th>
                    <th>Reason</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="hotel-table__empty">
                        No entries.
                      </td>
                    </tr>
                  ) : (
                    entries.map((row) => {
                      const hid = row.hotel_id ?? row.hotelId
                      return (
                        <tr key={row.id}>
                          <td>
                            <code className="hotel-code">{hid ?? '—'}</code>
                          </td>
                          <td>{row.full_name ?? row.fullName ?? row.name ?? '—'}</td>
                          <td>
                            <code className="hotel-code">{row.id_number ?? row.idNumber ?? '—'}</code>
                          </td>
                          <td>{row.date_of_birth ?? row.dateOfBirth ?? '—'}</td>
                          <td className="hotel-table__clamp">{row.reason ?? '—'}</td>
                          <td>
                            <button
                              type="button"
                              className="hotel-table__action hotel-table__action--danger"
                              disabled={deletingId === row.id}
                              onClick={() => handleDelete(row)}
                            >
                              {deletingId === row.id ? '…' : 'Delete'}
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
      </section>
    </div>
  )
}
