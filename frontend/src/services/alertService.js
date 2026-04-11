import { api, unwrapData, unwrapPaginated } from './api'

/**
 * Unread (unseen) count for the current user. Hotel users must pass `hotelId`.
 * @param {{ hotelId?: string }} [params]
 */
export async function getUnreadAlertCount(params) {
  const res = await api.get('/alerts/unread-count', { params })
  return unwrapData(res)
}

/**
 * @param {Record<string, string | number | undefined>} [params] page, limit
 */
export async function listAlerts(params) {
  const res = await api.get('/alerts', { params })
  return unwrapPaginated(res)
}

/**
 * Mark alert as seen (sidebar badge) for the current user.
 * @param {string} alertId UUID
 */
export async function markAlertSeen(alertId) {
  const res = await api.post(`/alerts/${alertId}/read`)
  return unwrapData(res)
}

/**
 * Mark all in-scope alerts as seen for the current user.
 * @param {{ hotelId?: string }} [body] required for hotel role
 */
export async function markAllAlertsSeen(body) {
  const res = await api.post('/alerts/read-all', body ?? {})
  return unwrapData(res)
}

/**
 * @param {string} alertId UUID
 */
export async function markAlertReviewed(alertId) {
  const res = await api.patch(`/alerts/${alertId}`)
  return unwrapData(res)
}

/**
 * @param {string} hotelId UUID
 * @param {Record<string, string | number | undefined>} [params] page, limit
 */
export async function listAlertsForHotel(hotelId, params) {
  const res = await api.get(`/hotels/${hotelId}/alerts`, { params })
  return unwrapPaginated(res)
}
