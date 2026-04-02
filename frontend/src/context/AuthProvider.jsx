import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './auth-context'
import { AUTH_STORAGE, readStoredUser } from './storage'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredUser())
  const [token, setToken] = useState(() => localStorage.getItem(AUTH_STORAGE.token))

  useEffect(() => {
    const t = localStorage.getItem(AUTH_STORAGE.token)
    const u = readStoredUser()
    if (t && !u) {
      localStorage.removeItem(AUTH_STORAGE.token)
      setToken(null)
    }
    if (!t && u) {
      localStorage.removeItem(AUTH_STORAGE.user)
      setUser(null)
    }
  }, [])

  const login = useCallback(({ token: nextToken, user: nextUser }) => {
    if (nextToken) {
      localStorage.setItem(AUTH_STORAGE.token, nextToken)
      setToken(nextToken)
    }
    if (nextUser) {
      localStorage.setItem(AUTH_STORAGE.user, JSON.stringify(nextUser))
      setUser(nextUser)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE.token)
    localStorage.removeItem(AUTH_STORAGE.user)
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
    }),
    [user, token, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
