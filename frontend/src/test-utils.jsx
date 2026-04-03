import { vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from './context/auth-context'

const DEFAULT_AUTH = {
  user: null,
  token: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
}

/**
 * Render a component with MemoryRouter and a controllable AuthContext value.
 * @param {React.ReactElement} ui
 * @param {{ authValue?: Partial<typeof DEFAULT_AUTH>; initialEntries?: string[] }} [options]
 */
export function renderWithAuth(ui, { authValue = {}, initialEntries = ['/'] } = {}) {
  const value = { ...DEFAULT_AUTH, ...authValue }
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </AuthContext.Provider>,
  )
}

/**
 * Build a compact mock auth value for an authenticated user.
 * @param {{ role?: string; id?: string; email?: string; extra?: object }} [opts]
 */
export function mockAuthUser({ role = 'hotel', id = 'user-1', email = 'test@example.com', extra = {} } = {}) {
  return {
    user: { id, email, role, fullName: 'Test User', ...extra },
    token: 'mock.jwt.token',
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  }
}
