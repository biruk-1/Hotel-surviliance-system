import { api, unwrapData, unwrapPaginated } from './api'

/**
 * @param {Record<string, string | number | undefined>} [params] page, limit
 */
export async function listAlerts(params) {
  const res = await api.get('/alerts', { params })
  return unwrapPaginated(res)
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
