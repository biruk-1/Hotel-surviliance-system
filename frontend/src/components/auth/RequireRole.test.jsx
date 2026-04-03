import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import RequireRole from './RequireRole'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../../hooks/useAuth'

function makeAuth(role) {
  return {
    isAuthenticated: true,
    user: { id: 'u1', email: 'x@x.com', role },
  }
}

/**
 * Embed RequireRole inside proper Routes so navigation breaks the render loop.
 */
function renderGuard(authValue, requiredRole, initialPath = '/protected') {
  useAuth.mockReturnValue(authValue)
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/hotel/dashboard" element={<div>Hotel dashboard</div>} />
        <Route path="/police/dashboard" element={<div>Police dashboard</div>} />
        <Route path="/admin/dashboard" element={<div>Admin dashboard</div>} />
        <Route
          path="/protected"
          element={
            <RequireRole role={requiredRole}>
              <div>Guarded content</div>
            </RequireRole>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireRole', () => {
  it('renders children when role matches (hotel)', () => {
    renderGuard(makeAuth('hotel'), 'hotel')
    expect(screen.getByText('Guarded content')).toBeInTheDocument()
  })

  it('renders children when role matches (police)', () => {
    renderGuard(makeAuth('police'), 'police')
    expect(screen.getByText('Guarded content')).toBeInTheDocument()
  })

  it('renders children when role matches (admin)', () => {
    renderGuard(makeAuth('admin'), 'admin')
    expect(screen.getByText('Guarded content')).toBeInTheDocument()
  })

  it('redirects to own dashboard when role does not match', () => {
    renderGuard(makeAuth('police'), 'hotel')
    expect(screen.queryByText('Guarded content')).not.toBeInTheDocument()
    expect(screen.getByText('Police dashboard')).toBeInTheDocument()
  })

  it('redirects to login when not authenticated', () => {
    renderGuard({ isAuthenticated: false, user: null }, 'admin')
    expect(screen.queryByText('Guarded content')).not.toBeInTheDocument()
    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  it('redirects for tampered role value', () => {
    renderGuard({ isAuthenticated: true, user: { id: 'u1', email: 'x@x.com', role: 'superadmin' } }, 'admin')
    expect(screen.queryByText('Guarded content')).not.toBeInTheDocument()
  })
})
