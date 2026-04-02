export const AUTH_STORAGE = {
  token: 'accessToken',
  user: 'authUser',
}

export function readStoredUser() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE.user)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && 'role' in parsed) return parsed
    return null
  } catch {
    return null
  }
}
