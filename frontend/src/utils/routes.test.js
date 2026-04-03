import { describe, it, expect } from 'vitest'
import { getDashboardPathForRole, getPostLoginPath, ROUTES } from './routes'

describe('getDashboardPathForRole', () => {
  it('returns hotel dashboard for hotel role', () => {
    expect(getDashboardPathForRole('hotel')).toBe(ROUTES.hotel.dashboard)
  })

  it('returns police dashboard for police role', () => {
    expect(getDashboardPathForRole('police')).toBe(ROUTES.police.dashboard)
  })

  it('returns admin dashboard for admin role', () => {
    expect(getDashboardPathForRole('admin')).toBe(ROUTES.admin.dashboard)
  })

  it('returns login path for unknown role', () => {
    expect(getDashboardPathForRole('unknown')).toBe(ROUTES.login)
    expect(getDashboardPathForRole(undefined)).toBe(ROUTES.login)
    expect(getDashboardPathForRole(null)).toBe(ROUTES.login)
    expect(getDashboardPathForRole('')).toBe(ROUTES.login)
  })
})

describe('getPostLoginPath', () => {
  it('returns from path when it matches the role portal', () => {
    expect(getPostLoginPath('hotel', '/hotel/guests')).toBe('/hotel/guests')
    expect(getPostLoginPath('police', '/police/alerts')).toBe('/police/alerts')
    expect(getPostLoginPath('admin', '/admin/hotels')).toBe('/admin/hotels')
  })

  it('returns dashboard when from is in a different portal', () => {
    expect(getPostLoginPath('hotel', '/police/alerts')).toBe(ROUTES.hotel.dashboard)
    expect(getPostLoginPath('police', '/admin/users')).toBe(ROUTES.police.dashboard)
    expect(getPostLoginPath('admin', '/hotel/guests')).toBe(ROUTES.admin.dashboard)
  })

  it('returns dashboard when from is undefined', () => {
    expect(getPostLoginPath('hotel', undefined)).toBe(ROUTES.hotel.dashboard)
    expect(getPostLoginPath('police', undefined)).toBe(ROUTES.police.dashboard)
  })

  it('returns dashboard when from is the login path', () => {
    expect(getPostLoginPath('admin', '/login')).toBe(ROUTES.admin.dashboard)
  })

  it('returns dashboard when from is not a string', () => {
    expect(getPostLoginPath('hotel', null)).toBe(ROUTES.hotel.dashboard)
    expect(getPostLoginPath('hotel', 42)).toBe(ROUTES.hotel.dashboard)
  })

  it('falls back to login path for unknown role', () => {
    expect(getPostLoginPath('unknown', '/unknown/path')).toBe(ROUTES.login)
  })
})
