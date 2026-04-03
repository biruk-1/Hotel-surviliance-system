import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  parseTokenPayload,
  getTokenExpiryMs,
  isTokenExpired,
  tokenMsRemaining,
} from './tokenExpiry'

/** Build a minimal JWT with a given payload (unsigned, for testing only). */
function buildToken(payload) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  const body = btoa(JSON.stringify(payload))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  return `${header}.${body}.sig`
}

const FIXED_NOW = 1_700_000_000_000

describe('parseTokenPayload', () => {
  it('returns null for falsy input', () => {
    expect(parseTokenPayload(null)).toBe(null)
    expect(parseTokenPayload(undefined)).toBe(null)
    expect(parseTokenPayload('')).toBe(null)
  })

  it('returns null for non-JWT strings', () => {
    expect(parseTokenPayload('notajwt')).toBe(null)
    expect(parseTokenPayload('a.b')).toBe(null)
  })

  it('returns null for malformed base64 body', () => {
    expect(parseTokenPayload('header.!!!.sig')).toBe(null)
  })

  it('parses payload fields correctly', () => {
    const token = buildToken({ sub: 'user-1', role: 'police', exp: 9999999999 })
    const payload = parseTokenPayload(token)
    expect(payload).not.toBe(null)
    expect(payload.sub).toBe('user-1')
    expect(payload.role).toBe('police')
    expect(payload.exp).toBe(9999999999)
  })
})

describe('getTokenExpiryMs', () => {
  it('returns null when token has no exp', () => {
    const token = buildToken({ sub: 'u1' })
    expect(getTokenExpiryMs(token)).toBe(null)
  })

  it('returns exp * 1000', () => {
    const exp = 1_700_000_000
    const token = buildToken({ sub: 'u1', exp })
    expect(getTokenExpiryMs(token)).toBe(exp * 1000)
  })

  it('returns null for null token', () => {
    expect(getTokenExpiryMs(null)).toBe(null)
  })
})

describe('isTokenExpired', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(FIXED_NOW))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns false if token has no exp (fail-open)', () => {
    const token = buildToken({ sub: 'u1' })
    expect(isTokenExpired(token)).toBe(false)
  })

  it('returns false for future expiry', () => {
    const exp = Math.floor((FIXED_NOW + 3600_000) / 1000)
    const token = buildToken({ sub: 'u1', exp })
    expect(isTokenExpired(token)).toBe(false)
  })

  it('returns true when expiry equals current time (boundary)', () => {
    const exp = Math.floor(FIXED_NOW / 1000)
    const token = buildToken({ sub: 'u1', exp })
    expect(isTokenExpired(token)).toBe(true)
  })

  it('returns true for past expiry', () => {
    const exp = Math.floor((FIXED_NOW - 1000) / 1000)
    const token = buildToken({ sub: 'u1', exp })
    expect(isTokenExpired(token)).toBe(true)
  })

  it('returns false for null token', () => {
    expect(isTokenExpired(null)).toBe(false)
  })
})

describe('tokenMsRemaining', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(FIXED_NOW))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null when token has no exp', () => {
    const token = buildToken({ sub: 'u1' })
    expect(tokenMsRemaining(token)).toBe(null)
  })

  it('returns positive value for unexpired token', () => {
    const exp = Math.floor((FIXED_NOW + 60_000) / 1000)
    const token = buildToken({ sub: 'u1', exp })
    expect(tokenMsRemaining(token)).toBeGreaterThan(0)
  })

  it('returns negative value for expired token', () => {
    const exp = Math.floor((FIXED_NOW - 60_000) / 1000)
    const token = buildToken({ sub: 'u1', exp })
    expect(tokenMsRemaining(token)).toBeLessThan(0)
  })
})
