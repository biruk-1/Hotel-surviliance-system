/**
 * @param {unknown} error
 * @param {string} [fallback]
 */
export function getApiErrorMessage(error, fallback = 'Something went wrong') {
  if (error && typeof error === 'object' && 'response' in error) {
    const res = /** @type {{ response?: { data?: { error?: { message?: string } } } }} */ (error)
    const msg = res.response?.data?.error?.message
    if (typeof msg === 'string' && msg.trim()) return msg
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}
