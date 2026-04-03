import { describe, it, expect } from 'vitest'
import {
  stripControlChars,
  sanitizeText,
  sanitizeEmail,
  sanitizeLine,
} from './sanitize'

describe('stripControlChars', () => {
  it('removes null bytes', () => {
    expect(stripControlChars('hello\x00world')).toBe('helloworld')
  })

  it('removes BEL and other control chars', () => {
    expect(stripControlChars('abc\x07\x08def')).toBe('abcdef')
  })

  it('preserves tab, newline, carriage return', () => {
    expect(stripControlChars('a\tb\nc\rd')).toBe('a\tb\nc\rd')
  })

  it('preserves DEL (0x7F) — no, actually strips it', () => {
    expect(stripControlChars('ab\x7Fcd')).toBe('abcd')
  })

  it('returns non-string values unchanged', () => {
    expect(stripControlChars(42)).toBe(42)
    expect(stripControlChars(null)).toBe(null)
    expect(stripControlChars(undefined)).toBe(undefined)
  })

  it('returns empty string unchanged', () => {
    expect(stripControlChars('')).toBe('')
  })

  it('leaves normal text untouched', () => {
    expect(stripControlChars('Hello, World!')).toBe('Hello, World!')
  })
})

describe('sanitizeText', () => {
  it('trims surrounding whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello')
  })

  it('collapses internal whitespace by default', () => {
    expect(sanitizeText('foo   bar\t\nbaz')).toBe('foo bar baz')
  })

  it('does not collapse when collapseWhitespace=false', () => {
    expect(sanitizeText('foo  bar', { collapseWhitespace: false })).toBe('foo  bar')
  })

  it('enforces maxLength', () => {
    expect(sanitizeText('hello world', { maxLength: 5 })).toBe('hello')
  })

  it('strips control characters', () => {
    expect(sanitizeText('name\x00\x01')).toBe('name')
  })

  it('returns non-string values unchanged', () => {
    expect(sanitizeText(undefined)).toBe(undefined)
    expect(sanitizeText(null)).toBe(null)
  })
})

describe('sanitizeEmail', () => {
  it('trims whitespace and lowercases', () => {
    expect(sanitizeEmail('  Admin@Hotel.COM  ')).toBe('admin@hotel.com')
  })

  it('strips control characters', () => {
    expect(sanitizeEmail('user\x00@example.com')).toBe('user@example.com')
  })

  it('handles empty string', () => {
    expect(sanitizeEmail('')).toBe('')
  })

  it('returns non-string values unchanged', () => {
    expect(sanitizeEmail(null)).toBe(null)
  })
})

describe('sanitizeLine', () => {
  it('replaces newlines with space', () => {
    expect(sanitizeLine('line1\nline2\r\nline3')).toBe('line1 line2 line3')
  })

  it('trims and collapses whitespace', () => {
    expect(sanitizeLine('  hello   world  ')).toBe('hello world')
  })

  it('enforces maxLength', () => {
    expect(sanitizeLine('hello world', { maxLength: 5 })).toBe('hello')
  })
})
