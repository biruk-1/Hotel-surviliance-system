import { describe, it, expect } from 'vitest'
import { getApiErrorMessage } from './apiError'

describe('getApiErrorMessage', () => {
  it('returns the server error message from an axios error', () => {
    const err = { response: { data: { error: { message: 'Invalid credentials' } } } }
    expect(getApiErrorMessage(err)).toBe('Invalid credentials')
  })

  it('returns fallback when message is empty string', () => {
    const err = { response: { data: { error: { message: '' } } } }
    expect(getApiErrorMessage(err, 'fallback')).toBe('fallback')
  })

  it('returns fallback when response structure is missing', () => {
    expect(getApiErrorMessage({}, 'fallback')).toBe('fallback')
    expect(getApiErrorMessage({ response: {} }, 'fallback')).toBe('fallback')
    expect(getApiErrorMessage({ response: { data: {} } }, 'fallback')).toBe('fallback')
  })

  it('returns Error.message for plain Error objects', () => {
    const err = new Error('Network failure')
    expect(getApiErrorMessage(err)).toBe('Network failure')
  })

  it('returns default fallback when error is null', () => {
    expect(getApiErrorMessage(null)).toBe('Something went wrong')
  })

  it('returns default fallback when error is undefined', () => {
    expect(getApiErrorMessage(undefined)).toBe('Something went wrong')
  })

  it('returns custom fallback when provided', () => {
    expect(getApiErrorMessage(null, 'Custom error')).toBe('Custom error')
  })

  it('returns server message even when whitespace-only trimmed fallback would apply', () => {
    const err = { response: { data: { error: { message: '  bad request  ' } } } }
    expect(getApiErrorMessage(err)).toBe('  bad request  ')
  })
})
