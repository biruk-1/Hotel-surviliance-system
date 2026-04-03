import { api, unwrapData, unwrapPaginated } from './api'

/**
 * Top-level blacklist (police/admin). Optional hotelId filter.
 * @param {Record<string, string | number | undefined>} [params] hotelId, page, limit
 */
export async function listBlacklist(params) {
  const res = await api.get('/blacklist', { params })
  return unwrapPaginated(res)
}

/**
 * Police only. Body includes hotelId.
 * @param {Record<string, unknown>} body name, idNumber, dateOfBirth, reason?, hotelId
 */
export async function createBlacklistEntry(body) {
  const res = await api.post('/blacklist', body)
  return unwrapData(res)
}

/**
 * @param {string} hotelId UUID
 * @param {Record<string, string | number | undefined>} [params] page, limit
 */
export async function listBlacklistByHotel(hotelId, params) {
  const res = await api.get(`/hotels/${hotelId}/blacklist`, { params })
  return unwrapPaginated(res)
}

/**
 * @param {string} hotelId UUID
 * @param {Record<string, unknown>} body name, idNumber, dateOfBirth, reason?
 */
export async function createBlacklistEntryForHotel(hotelId, body) {
  const res = await api.post(`/hotels/${hotelId}/blacklist`, body)
  return unwrapData(res)
}

/**
 * Police only.
 * @param {string} hotelId UUID
 * @param {string} entryId Blacklist row UUID
 */
export async function removeBlacklistEntry(hotelId, entryId) {
  await api.delete(`/hotels/${hotelId}/blacklist/${entryId}`)
}
