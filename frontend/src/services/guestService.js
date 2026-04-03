import { api, unwrapData, unwrapPaginated } from './api'

/**
 * @param {Record<string, string | number | undefined>} [params] hotelId, name, idNumber, page, limit
 */
export async function listGuests(params) {
  const res = await api.get('/guests', { params })
  return unwrapPaginated(res)
}

/**
 * @param {string} id Guest UUID
 */
export async function getGuestById(id) {
  const res = await api.get(`/guests/${id}`)
  return unwrapData(res)
}

/**
 * @param {Record<string, unknown>} body Guest + stay payload per API
 */
export async function createGuestWithStay(body) {
  const res = await api.post('/guests', body)
  return unwrapData(res)
}
