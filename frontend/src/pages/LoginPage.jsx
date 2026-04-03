import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { login as loginWithApi } from '../services/authService'
import { getApiErrorMessage } from '../utils/apiError'
import { getPostLoginPath } from '../utils/routes'
import { sanitizeEmail, stripControlChars } from '../utils/sanitize'
import './login.css'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const data = await loginWithApi({
        email: sanitizeEmail(email),
        password: stripControlChars(password),
      })
      login({ token: data.token, user: data.user })
      navigate(getPostLoginPath(data.user.role, from), { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err, 'Invalid email or password'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login">
      <div className="login__panel">
        <div className="login__brand">
          <div className="login__mark" aria-hidden />
          <div>
            <p className="login__eyebrow">Hotel Surveillance</p>
            <h1 className="login__title">Secure access</h1>
            <p className="login__lede">
              Authorized personnel only. Sessions are audited.
            </p>
          </div>
        </div>

        <form className="login__form" onSubmit={handleSubmit} noValidate>
          {error ? (
            <div className="login__error" role="alert">
              {error}
            </div>
          ) : null}

          <label className="login__field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@agency.gov"
              disabled={submitting}
              required
            />
          </label>
          <label className="login__field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              disabled={submitting}
              required
            />
          </label>
          <button type="submit" className="login__submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
