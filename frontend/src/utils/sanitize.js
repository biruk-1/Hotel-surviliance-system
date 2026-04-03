/**
 * Characters that are invisible/dangerous and never useful in text inputs:
 * NULL, control characters (excluding TAB \x09, LF \x0A, CR \x0D), and DEL.
 */
const CONTROL_CHARS_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g

/**
 * Strip control characters from a string.
 * @param {string} value
 * @returns {string}
 */
export function stripControlChars(value) {
  if (typeof value !== 'string') return value
  return value.replace(CONTROL_CHARS_RE, '')
}

/**
 * Sanitize a plain-text input value: strip control chars, collapse whitespace, trim, enforce max length.
 * @param {string} value
 * @param {{ maxLength?: number; collapseWhitespace?: boolean }} [options]
 * @returns {string}
 */
export function sanitizeText(value, { maxLength, collapseWhitespace = true } = {}) {
  if (typeof value !== 'string') return value
  let result = value.replace(CONTROL_CHARS_RE, '')
  if (collapseWhitespace) {
    result = result.replace(/\s+/g, ' ')
  }
  result = result.trim()
  if (typeof maxLength === 'number' && result.length > maxLength) {
    result = result.slice(0, maxLength)
  }
  return result
}

/**
 * Sanitize an email input: strip control chars, trim, lowercase.
 * @param {string} value
 * @returns {string}
 */
export function sanitizeEmail(value) {
  if (typeof value !== 'string') return value
  return value.replace(CONTROL_CHARS_RE, '').trim().toLowerCase()
}

/**
 * Sanitize a single-line field (no newlines allowed, collapsed to space).
 * @param {string} value
 * @param {{ maxLength?: number }} [options]
 * @returns {string}
 */
export function sanitizeLine(value, options = {}) {
  if (typeof value !== 'string') return value
  return sanitizeText(value.replace(/[\r\n]/g, ' '), options)
}
