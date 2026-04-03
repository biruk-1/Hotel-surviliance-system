export const AUTH_STORAGE = {
  token: 'accessToken',
  user: 'authUser',
}

const VALID_ROLES = ['hotel', 'police', 'admin']

/**
 * Read and validate the stored user from localStorage.
 * Returns null if the value is missing, malformed, or contains an invalid role.
 * Validates: id (string), email (string), role (known enum value).
 *
 * @returns {{ id: string; email: string; role: string; fullName?: string } | null}
 */
export function readStoredUser() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE.user)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.id === 'string' &&
      parsed.id.trim().length > 0 &&
      typeof parsed.email === 'string' &&
      parsed.email.includes('@') &&
      VALID_ROLES.includes(parsed.role)
    ) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}
