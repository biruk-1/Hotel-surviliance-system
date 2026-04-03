/**
 * Decode the payload of a JWT (Base64Url → JSON) WITHOUT verifying the signature.
 * Signature verification happens on the server; here we just need the exp claim
 * so the UI can proactively log the user out before the first 401 arrives.
 *
 * @param {string | null | undefined} token
 * @returns {Record<string, unknown> | null}
 */
export function parseTokenPayload(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    const payload = JSON.parse(json)
    if (payload && typeof payload === 'object') return payload
    return null
  } catch {
    return null
  }
}

/**
 * Return the expiry timestamp in **milliseconds** (Date.now() scale), or null if unavailable.
 * @param {string | null | undefined} token
 * @returns {number | null}
 */
export function getTokenExpiryMs(token) {
  const payload = parseTokenPayload(token)
  if (!payload || typeof payload.exp !== 'number') return null
  return payload.exp * 1000
}

/**
 * Return true if the token's `exp` claim is in the past.
 * Returns **false** if `exp` cannot be determined (fail-open so the server still validates).
 * @param {string | null | undefined} token
 * @returns {boolean}
 */
export function isTokenExpired(token) {
  const expiryMs = getTokenExpiryMs(token)
  if (expiryMs === null) return false
  return Date.now() >= expiryMs
}

/**
 * How many milliseconds remain until token expiry. Returns null if unknown.
 * Negative values mean the token is already expired.
 * @param {string | null | undefined} token
 * @returns {number | null}
 */
export function tokenMsRemaining(token) {
  const expiryMs = getTokenExpiryMs(token)
  if (expiryMs === null) return null
  return expiryMs - Date.now()
}
