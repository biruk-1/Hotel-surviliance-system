import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import RoleGate from './RoleGate'

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

function renderGate(authValue, gateProps) {
  useAuth.mockReturnValue(authValue)
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="*" element={<RoleGate {...gateProps} />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RoleGate', () => {
  it('renders children when role matches (string)', () => {
    renderGate(makeAuth('admin'), { roles: 'admin', children: <span>Admin content</span> })
    expect(screen.getByText('Admin content')).toBeInTheDocument()
  })

  it('renders children when role is in allowed array', () => {
    renderGate(makeAuth('police'), {
      roles: ['police', 'admin'],
      children: <span>Shared content</span>,
    })
    expect(screen.getByText('Shared content')).toBeInTheDocument()
  })

  it('renders nothing (default) when role does not match', () => {
    const { container } = renderGate(makeAuth('hotel'), {
      roles: 'admin',
      children: <span>Admin content</span>,
    })
    expect(container.textContent).toBe('')
  })

  it('renders custom fallback when role does not match', () => {
    renderGate(makeAuth('hotel'), {
      roles: 'police',
      fallback: <span>Access denied</span>,
      children: <span>Police content</span>,
    })
    expect(screen.getByText('Access denied')).toBeInTheDocument()
    expect(screen.queryByText('Police content')).not.toBeInTheDocument()
  })

  it('renders fallback when not authenticated', () => {
    renderGate({ isAuthenticated: false, user: null }, {
      roles: 'admin',
      fallback: <span>Not allowed</span>,
      children: <span>Admin</span>,
    })
    expect(screen.getByText('Not allowed')).toBeInTheDocument()
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
  })

  it('ignores invalid role strings in the roles prop', () => {
    const { container } = renderGate(makeAuth('hotel'), {
      roles: ['superadmin', 'root'],
      children: <span>Should not show</span>,
    })
    expect(container.textContent).toBe('')
  })

  it('blocks users with tampered/unknown role', () => {
    const { container } = renderGate(
      { isAuthenticated: true, user: { id: 'u1', email: 'a@b.com', role: 'superadmin' } },
      { roles: 'admin', children: <span>Admin</span> },
    )
    expect(container.textContent).toBe('')
  })

  it('renders for all three valid roles when all are allowed', () => {
    for (const role of ['hotel', 'police', 'admin']) {
      useAuth.mockReturnValue(makeAuth(role))
      const { unmount } = render(
        <MemoryRouter>
          <Routes>
            <Route
              path="*"
              element={
                <RoleGate roles={['hotel', 'police', 'admin']}>
                  <span>Everyone</span>
                </RoleGate>
              }
            />
          </Routes>
        </MemoryRouter>,
      )
      expect(screen.getByText('Everyone')).toBeInTheDocument()
      unmount()
    }
  })
})
