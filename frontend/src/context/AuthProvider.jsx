import { useCallback, useEffect, useMemo, useState } from 'react'
import { setUnauthorizedHandler } from '../services/api'
import { AuthContext } from './auth-context'
import { AUTH_STORAGE, readStoredUser } from './storage'
import { isTokenExpired } from '../utils/tokenExpiry'

/** How often (ms) to poll for token expiry while a session is active. */
const EXPIRY_CHECK_INTERVAL_MS = 30_000

function sanitizeStoredAuth() {
  const token = localStorage.getItem(AUTH_STORAGE.token)
  const user = readStoredUser()

  if (token && !user) {
    localStorage.removeItem(AUTH_STORAGE.token)
    return { token: null, user: null }
  }
  if (!token && user) {
    localStorage.removeItem(AUTH_STORAGE.user)
    return { token: null, user: null }
  }
  if (token && isTokenExpired(token)) {
    localStorage.removeItem(AUTH_STORAGE.token)
    localStorage.removeItem(AUTH_STORAGE.user)
    return { token: null, user: null }
  }
  return { token, user }
}

function clearStorage() {
  localStorage.removeItem(AUTH_STORAGE.token)
  localStorage.removeItem(AUTH_STORAGE.user)
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => sanitizeStoredAuth())

  const login = useCallback(({ token: nextToken, user: nextUser }) => {
    if (nextToken) localStorage.setItem(AUTH_STORAGE.token, nextToken)
    if (nextUser) localStorage.setItem(AUTH_STORAGE.user, JSON.stringify(nextUser))
    setAuth({ token: nextToken ?? null, user: nextUser ?? null })
  }, [])

  const logout = useCallback(() => {
    clearStorage()
    setAuth({ token: null, user: null })
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout()
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    })
    return () => setUnauthorizedHandler(() => {})
  }, [logout])

  useEffect(() => {
    if (!auth.token) return

    const check = () => {
      if (isTokenExpired(auth.token)) {
        logout()
        if (window.location.pathname !== '/login') {
          window.location.assign('/login')
        }
      }
    }

    const id = window.setInterval(check, EXPIRY_CHECK_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [auth.token, logout])

  const value = useMemo(
    () => ({
      user: auth.user,
      token: auth.token,
      isAuthenticated: Boolean(auth.token && auth.user),
      login,
      logout,
    }),
    [auth.token, auth.user, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
