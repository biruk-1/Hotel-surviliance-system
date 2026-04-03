import { useCallback, useEffect, useState } from 'react'
import {
  createBlacklistEntry,
  listBlacklist,
  removeBlacklistEntry,
} from '../../services/blacklistService'
import { getApiErrorMessage } from '../../utils/apiError'
import InlineSpinner from '../../components/common/InlineSpinner'
import './police-pages.css'

const PAGE_SIZE = 20

function formatDateAdded(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return String(iso)
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(iso)
  }
}

function formatDob(value) {
  if (!value) return '—'
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10)
  }
  return String(value)
}

export default function PoliceBlacklistPage() {
  const [page, setPage] = useState(1)
  const [entries, setEntries] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
      const { data, pagination: pag } = await listBlacklist({ page, limit: PAGE_SIZE })
      setEntries(data?.entries ?? [])
      setPagination(pag ?? null)
    } catch (e) {
      setError(e)
      setEntries([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    loadList()
  }, [loadList])

  async function handleCreate(e) {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)
    setSubmitting(true)
    try {
      await createBlacklistEntry({
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

  async function handleDelete(row) {
    const id = row.id
    if (!id) return
    if (!window.confirm('Remove this blacklist entry?')) return
    setDeletingId(id)
    try {
      await removeBlacklistEntry(String(id))
      await loadList()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not delete'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="hotel-page">
      <p className="police-bl-global-msg" role="note">
        Blacklist entries apply across all hotels. Guest registrations are checked against this list
        automatically.
      </p>

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
          <div className="police-search-grid police-bl-form-grid">
            <label className="hotel-form__field">
              <span>Full name</span>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                disabled={submitting}
                autoComplete="name"
              />
            </label>
            <label className="hotel-form__field">
              <span>ID number</span>
              <input
                value={formIdNumber}
                onChange={(e) => setFormIdNumber(e.target.value)}
                required
                disabled={submitting}
                autoComplete="off"
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
            {submitting ? (
              <span className="police-bl-submit-inline">
                <InlineSpinner size="sm" label="" />
                Saving…
              </span>
            ) : (
              'Add to blacklist'
            )}
          </button>
        </form>
      </section>

      <section className="police-bl-section">
        <h2 className="police-bl-heading">Registry</h2>

        {loading ? (
          <p className="hotel-page-hint hotel-page-hint--inline" role="status">
            <InlineSpinner size="sm" label="Loading blacklist" />
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
              <table className="hotel-table hotel-table--responsive">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>ID number</th>
                    <th>Date of birth</th>
                    <th>Reason</th>
                    <th>Date added</th>
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
                    entries.map((row) => (
                      <tr key={row.id}>
                        <td data-label="Name">{row.full_name ?? row.fullName ?? row.name ?? '—'}</td>
                        <td data-label="ID number">
                          <code className="hotel-code">{row.id_number ?? row.idNumber ?? '—'}</code>
                        </td>
                        <td data-label="Date of birth">
                          {formatDob(row.date_of_birth ?? row.dateOfBirth)}
                        </td>
                        <td data-label="Reason" className="hotel-table__clamp">
                          {row.reason ?? '—'}
                        </td>
                        <td data-label="Date added">{formatDateAdded(row.created_at)}</td>
                        <td data-label="Actions">
                          <button
                            type="button"
                            className="hotel-table__action hotel-table__action--danger"
                            disabled={deletingId === row.id}
                            onClick={() => handleDelete(row)}
                          >
                            {deletingId === row.id ? (
                              <span className="hotel-table__action-content">
                                <InlineSpinner size="sm" label="" />
                                …
                              </span>
                            ) : (
                              'Delete'
                            )}
                          </button>
                        </td>
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
