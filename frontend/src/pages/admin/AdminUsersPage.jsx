import { useCallback, useEffect, useMemo, useState } from 'react'
import InlineSpinner from '../../components/common/InlineSpinner'
import { createUser, listUsers } from '../../services/adminService'
import { getApiErrorMessage } from '../../utils/apiError'
import '../page.css'
import '../hotel/hotel-pages.css'
import './admin-pages.css'

const ROLES = [
  { value: 'hotel', label: 'Hotel staff' },
  { value: 'police', label: 'Police' },
  { value: 'admin', label: 'Administrator' },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('hotel')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const [formSuccess, setFormSuccess] = useState(null)

  const passwordChecks = useMemo(
    () => ({
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      digit: /[0-9]/.test(password),
    }),
    [password],
  )

  const validation = useMemo(() => {
    const next = {}
    if (fullName.trim().length < 2) next.fullName = 'Full name must be at least 2 characters.'
    if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address.'
    if (!passwordChecks.length || !passwordChecks.upper || !passwordChecks.lower || !passwordChecks.digit) {
      next.password = 'Password does not meet the requirements.'
    }
    return next
  }, [email, fullName, passwordChecks])

  const canSubmit = !submitting && Object.keys(validation).length === 0

  const loadUsers = useCallback(async () => {
    setListError(null)
    setLoading(true)
    try {
      const data = await listUsers()
      setUsers(data.users ?? [])
    } catch (err) {
      setListError(getApiErrorMessage(err, 'Could not load users'))
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)
    if (!canSubmit) {
      setFormError('Please correct the highlighted fields before submitting.')
      return
    }
    setSubmitting(true)
    try {
      const data = await createUser({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        role,
      })
      setFormSuccess(`Account created for ${data.user?.email ?? email}.`)
      setEmail('')
      setPassword('')
      setFullName('')
      setRole('hotel')
      await loadUsers()
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Could not create user'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-page hotel-page">
      <div className="page__card" style={{ marginBottom: '1rem' }}>
        <h2 className="page__title">User management</h2>
        <p className="page__text">
          Create operator accounts. Hotel staff must be assigned to properties under Hotel management
          before they can work in the hotel portal.
        </p>
      </div>

      <div className="admin-page__grid admin-page__grid--split">
        <div className="hotel-table-wrap">
          {listError ? (
            <div className="hotel-page-msg hotel-page-msg--error" role="alert">
              {listError}
              <button type="button" className="admin-retry-btn" onClick={loadUsers}>
                Retry
              </button>
            </div>
          ) : null}
          <p className="admin-table-meta">
            {loading ? 'Loading users…' : `${users.length} user${users.length === 1 ? '' : 's'} total`}
          </p>
          <table className="hotel-table hotel-table--responsive">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="hotel-table__empty">
                      <span className="hotel-page-hint--inline">
                        <InlineSpinner size="sm" label="Loading users" />
                        Loading users…
                      </span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={3} className="hotel-table__empty">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td data-label="Name">{u.fullName}</td>
                    <td data-label="Email" className="hotel-table__clamp">
                      {u.email}
                    </td>
                    <td data-label="Role">
                      <span className="hotel-code">{u.role}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-page__card">
          <h3>New user</h3>
          <form className="admin-form" onSubmit={handleSubmit}>
            {formError ? (
              <div className="hotel-page-msg hotel-page-msg--error" role="alert">
                {formError}
              </div>
            ) : null}
            {formSuccess ? (
              <div className="hotel-page-msg" role="status">
                {formSuccess}
              </div>
            ) : null}

            <label className="admin-form__field">
              <span>Full name</span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={submitting}
                autoComplete="name"
                aria-invalid={Boolean(validation.fullName)}
              />
              {validation.fullName ? <p className="admin-form__error">{validation.fullName}</p> : null}
            </label>
            <label className="admin-form__field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={submitting}
                autoComplete="off"
                aria-invalid={Boolean(validation.email)}
              />
              {validation.email ? <p className="admin-form__error">{validation.email}</p> : null}
            </label>
            <label className="admin-form__field">
              <span>Initial password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={submitting}
                autoComplete="new-password"
                minLength={8}
                aria-invalid={Boolean(validation.password)}
              />
              {validation.password ? <p className="admin-form__error">{validation.password}</p> : null}
            </label>
            <ul className="admin-password-rules">
              <li data-pass={passwordChecks.length}>At least 8 characters</li>
              <li data-pass={passwordChecks.upper}>One uppercase letter</li>
              <li data-pass={passwordChecks.lower}>One lowercase letter</li>
              <li data-pass={passwordChecks.digit}>One digit</li>
            </ul>
            <label className="admin-form__field">
              <span>Role</span>
              <select value={role} onChange={(e) => setRole(e.target.value)} disabled={submitting}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="admin-form__submit" disabled={!canSubmit}>
              <span className="admin-form__submit-content">
                {submitting ? <InlineSpinner size="sm" label="Creating user" /> : null}
                {submitting ? 'Creating…' : 'Create user'}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
