import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import GuestOnly from './GuestOnly'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../../hooks/useAuth'

/**
 * Embed GuestOnly inside proper Routes so navigation breaks the render loop.
 */
function renderGuard(authValue) {
  useAuth.mockReturnValue(authValue)
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/hotel/dashboard" element={<div>Hotel dashboard</div>} />
        <Route path="/police/dashboard" element={<div>Police dashboard</div>} />
        <Route path="/admin/dashboard" element={<div>Admin dashboard</div>} />
        <Route
          path="/login"
          element={
            <GuestOnly>
              <div>Login form</div>
            </GuestOnly>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('GuestOnly', () => {
  it('renders children when not authenticated', () => {
    renderGuard({ isAuthenticated: false, user: null })
    expect(screen.getByText('Login form')).toBeInTheDocument()
  })

  it('redirects hotel user to hotel dashboard', () => {
    renderGuard({ isAuthenticated: true, user: { id: 'u1', email: 'a@b.com', role: 'hotel' } })
    expect(screen.queryByText('Login form')).not.toBeInTheDocument()
    expect(screen.getByText('Hotel dashboard')).toBeInTheDocument()
  })

  it('redirects police user to police dashboard', () => {
    renderGuard({ isAuthenticated: true, user: { id: 'u2', email: 'cop@gov.com', role: 'police' } })
    expect(screen.queryByText('Login form')).not.toBeInTheDocument()
    expect(screen.getByText('Police dashboard')).toBeInTheDocument()
  })

  it('redirects admin user to admin dashboard', () => {
    renderGuard({ isAuthenticated: true, user: { id: 'u3', email: 'admin@sys.com', role: 'admin' } })
    expect(screen.queryByText('Login form')).not.toBeInTheDocument()
    expect(screen.getByText('Admin dashboard')).toBeInTheDocument()
  })
})
