import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Shield, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { login as loginWithApi } from '../services/authService'
import { getApiErrorMessage } from '../utils/apiError'
import { getPostLoginPath } from '../utils/routes'
import { sanitizeEmail, stripControlChars } from '../utils/sanitize'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-[360px] space-y-8">

        {/* Brand mark */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-card">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Hotel Surveillance</h1>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Authorized personnel only.
              <br />
              Sessions are audited.
            </p>
          </div>
        </div>

        {/* Form card */}
        <div className="rounded-lg border border-border bg-card shadow-card p-6 space-y-5">
          <div>
            <h2 className="text-[15px] font-semibold">Sign in to your account</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Enter your credentials below</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {error && (
              <Alert variant="destructive" className="py-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@agency.gov"
                disabled={submitting}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                disabled={submitting}
                required
              />
            </div>

            <Button type="submit" className="w-full mt-1" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>

      </div>
    </div>
  )
}
