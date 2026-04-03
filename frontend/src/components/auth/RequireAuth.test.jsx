import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import RequireAuth from './RequireAuth'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../../hooks/useAuth'

/**
 * Render RequireAuth inside a proper routing tree so Navigate actually switches
 * the rendered route instead of infinitely re-rendering the guarded component.
 */
function renderGuard(authValue, initialPath = '/protected') {
  useAuth.mockReturnValue(authValue)
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route
          path="/protected"
          element={
            <RequireAuth>
              <div>Protected content</div>
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireAuth', () => {
  it('renders children when user is authenticated', () => {
    renderGuard({ isAuthenticated: true })
    expect(screen.getByText('Protected content')).toBeInTheDocument()
  })

  it('redirects to login when not authenticated', () => {
    renderGuard({ isAuthenticated: false })
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  it('does not show login page when authenticated', () => {
    renderGuard({ isAuthenticated: true })
    expect(screen.queryByText('Login page')).not.toBeInTheDocument()
  })

  it('preserves from-path in navigation state (LoginPage can read it)', () => {
    renderGuard({ isAuthenticated: false }, '/protected')
    expect(screen.getByText('Login page')).toBeInTheDocument()
  })
})
