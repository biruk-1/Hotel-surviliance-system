import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from './AuthProvider'
import { useAuth } from '../hooks/useAuth'
import { AUTH_STORAGE } from './storage'

vi.mock('../utils/tokenExpiry', () => ({
  isTokenExpired: vi.fn(() => false),
}))

vi.mock('../services/api', () => ({
  setUnauthorizedHandler: vi.fn(),
}))

import { isTokenExpired } from '../utils/tokenExpiry'

function TestConsumer() {
  const { user, isAuthenticated, token, logout } = useAuth()
  return (
    <div>
      <span data-testid="auth">{isAuthenticated ? 'yes' : 'no'}</span>
      <span data-testid="role">{user?.role ?? 'none'}</span>
      <span data-testid="email">{user?.email ?? 'none'}</span>
      <span data-testid="token">{token ?? 'none'}</span>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

function Wrapper({ children }) {
  return (
    <MemoryRouter>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    isTokenExpired.mockReturnValue(false)
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { pathname: '/', assign: vi.fn() },
    })
  })

  afterEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('starts unauthenticated when localStorage is empty', () => {
    render(<TestConsumer />, { wrapper: Wrapper })
    expect(screen.getByTestId('auth').textContent).toBe('no')
    expect(screen.getByTestId('role').textContent).toBe('none')
  })

  it('restores authenticated session from valid localStorage data', () => {
    const user = { id: 'u1', email: 'test@hotel.com', role: 'hotel' }
    localStorage.setItem(AUTH_STORAGE.token, 'valid.jwt.token')
    localStorage.setItem(AUTH_STORAGE.user, JSON.stringify(user))

    render(<TestConsumer />, { wrapper: Wrapper })
    expect(screen.getByTestId('auth').textContent).toBe('yes')
    expect(screen.getByTestId('role').textContent).toBe('hotel')
    expect(screen.getByTestId('email').textContent).toBe('test@hotel.com')
  })

  it('clears auth when token is expired on mount', () => {
    isTokenExpired.mockReturnValue(true)
    const user = { id: 'u1', email: 'a@b.com', role: 'police' }
    localStorage.setItem(AUTH_STORAGE.token, 'expired.jwt.token')
    localStorage.setItem(AUTH_STORAGE.user, JSON.stringify(user))

    render(<TestConsumer />, { wrapper: Wrapper })
    expect(screen.getByTestId('auth').textContent).toBe('no')
    expect(localStorage.getItem(AUTH_STORAGE.token)).toBeNull()
    expect(localStorage.getItem(AUTH_STORAGE.user)).toBeNull()
  })

  it('clears auth when token exists but user has invalid role', () => {
    localStorage.setItem(AUTH_STORAGE.token, 'some.jwt')
    localStorage.setItem(
      AUTH_STORAGE.user,
      JSON.stringify({ id: 'u1', email: 'x@y.com', role: 'hacker' }),
    )
    render(<TestConsumer />, { wrapper: Wrapper })
    expect(screen.getByTestId('auth').textContent).toBe('no')
  })

  it('clears auth when user data exists but token is missing', () => {
    const user = { id: 'u1', email: 'a@b.com', role: 'admin' }
    localStorage.setItem(AUTH_STORAGE.user, JSON.stringify(user))
    render(<TestConsumer />, { wrapper: Wrapper })
    expect(screen.getByTestId('auth').textContent).toBe('no')
  })

  it('logout clears state and localStorage', async () => {
    const user = { id: 'u1', email: 'x@y.com', role: 'hotel' }
    localStorage.setItem(AUTH_STORAGE.token, 'tok')
    localStorage.setItem(AUTH_STORAGE.user, JSON.stringify(user))

    render(<TestConsumer />, { wrapper: Wrapper })
    expect(screen.getByTestId('auth').textContent).toBe('yes')

    await userEvent.click(screen.getByRole('button', { name: 'Logout' }))

    expect(screen.getByTestId('auth').textContent).toBe('no')
    expect(screen.getByTestId('role').textContent).toBe('none')
    expect(localStorage.getItem(AUTH_STORAGE.token)).toBeNull()
    expect(localStorage.getItem(AUTH_STORAGE.user)).toBeNull()
  })

  it('triggers logout when token expires during polling interval', async () => {
    vi.useFakeTimers()

    const user = { id: 'u1', email: 'a@b.com', role: 'hotel' }
    localStorage.setItem(AUTH_STORAGE.token, 'live.jwt.token')
    localStorage.setItem(AUTH_STORAGE.user, JSON.stringify(user))

    isTokenExpired.mockReturnValue(false)
    render(<TestConsumer />, { wrapper: Wrapper })
    expect(screen.getByTestId('auth').textContent).toBe('yes')

    isTokenExpired.mockReturnValue(true)

    await act(async () => {
      vi.advanceTimersByTime(31_000)
    })

    expect(screen.getByTestId('auth').textContent).toBe('no')

    vi.useRealTimers()
  })
})
