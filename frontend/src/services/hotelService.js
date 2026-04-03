import { api, unwrapData } from './api'

export async function getMyHotels() {
  const res = await api.get('/hotels/my-assignments')
  return unwrapData(res)
}

/** Admin: all properties */
export async function listAllHotels() {
  const res = await api.get('/hotels')
  return unwrapData(res)
}

/**
 * @param {{
 *   name: string
 *   addressLine1?: string
 *   city?: string
 *   country?: string
 *   phone?: string
 * }} payload
 */
export async function createHotel(payload) {
  const res = await api.post('/hotels', payload)
  return unwrapData(res)
}

/**
 * @param {string} hotelId
 */
export async function listHotelUsers(hotelId) {
  const res = await api.get(`/hotels/${hotelId}/users`)
  return unwrapData(res)
}

/**
 * @param {string} hotelId
 * @param {string} userId
 */
export async function assignUserToHotel(hotelId, userId) {
  const res = await api.post(`/hotels/${hotelId}/users`, { userId })
  return unwrapData(res)
}

/**
 * @param {string} hotelId UUID
 */
export async function getHotelStats(hotelId) {
  const res = await api.get(`/hotels/${hotelId}/stats`)
  return unwrapData(res)
}
