import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readStoredUser, AUTH_STORAGE } from './storage'

describe('readStoredUser', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('returns null when nothing is stored', () => {
    expect(readStoredUser()).toBe(null)
  })

  it('returns null for invalid JSON', () => {
    localStorage.setItem(AUTH_STORAGE.user, '{invalid json}')
    expect(readStoredUser()).toBe(null)
  })

  it('returns null when role field is missing', () => {
    localStorage.setItem(AUTH_STORAGE.user, JSON.stringify({ id: 'u1', email: 'a@b.com' }))
    expect(readStoredUser()).toBe(null)
  })

  it('returns null when role is not a valid enum value', () => {
    localStorage.setItem(
      AUTH_STORAGE.user,
      JSON.stringify({ id: 'u1', email: 'a@b.com', role: 'superadmin' }),
    )
    expect(readStoredUser()).toBe(null)
  })

  it('returns null when id is missing', () => {
    localStorage.setItem(
      AUTH_STORAGE.user,
      JSON.stringify({ email: 'a@b.com', role: 'hotel' }),
    )
    expect(readStoredUser()).toBe(null)
  })

  it('returns null when id is an empty string', () => {
    localStorage.setItem(
      AUTH_STORAGE.user,
      JSON.stringify({ id: '', email: 'a@b.com', role: 'hotel' }),
    )
    expect(readStoredUser()).toBe(null)
  })

  it('returns null when email is missing', () => {
    localStorage.setItem(AUTH_STORAGE.user, JSON.stringify({ id: 'u1', role: 'police' }))
    expect(readStoredUser()).toBe(null)
  })

  it('returns null when email has no @ character', () => {
    localStorage.setItem(
      AUTH_STORAGE.user,
      JSON.stringify({ id: 'u1', email: 'notanemail', role: 'admin' }),
    )
    expect(readStoredUser()).toBe(null)
  })

  it('returns the user for a valid hotel user', () => {
    const user = { id: 'u1', email: 'staff@hotel.com', role: 'hotel', fullName: 'Alice' }
    localStorage.setItem(AUTH_STORAGE.user, JSON.stringify(user))
    expect(readStoredUser()).toEqual(user)
  })

  it('returns the user for a valid police user', () => {
    const user = { id: 'u2', email: 'cop@force.gov', role: 'police' }
    localStorage.setItem(AUTH_STORAGE.user, JSON.stringify(user))
    expect(readStoredUser()).toMatchObject({ id: 'u2', role: 'police' })
  })

  it('returns the user for a valid admin user', () => {
    const user = { id: 'u3', email: 'admin@sys.com', role: 'admin' }
    localStorage.setItem(AUTH_STORAGE.user, JSON.stringify(user))
    expect(readStoredUser()).toMatchObject({ role: 'admin' })
  })

  it('returns null for an array stored in localStorage', () => {
    localStorage.setItem(AUTH_STORAGE.user, JSON.stringify([{ id: 'u1' }]))
    expect(readStoredUser()).toBe(null)
  })

  it('returns null for a null JSON value', () => {
    localStorage.setItem(AUTH_STORAGE.user, 'null')
    expect(readStoredUser()).toBe(null)
  })
})
