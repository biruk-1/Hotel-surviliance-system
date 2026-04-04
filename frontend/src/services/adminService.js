import { api, unwrapData } from './api'

/**
 * @param {{ role?: 'hotel' | 'police' | 'admin' }} [params]
 */
export async function listUsers(params = {}) {
  const res = await api.get('/admin/users', { params })
  return unwrapData(res)
}

/**
 * @param {{
 *   email: string
 *   password: string
 *   fullName: string
 *   role: 'hotel' | 'police' | 'admin'
 * }} payload
 */
export async function createUser(payload) {
  const res = await api.post('/admin/users', payload)
  return unwrapData(res)
}

/**
 * @param {string} userId
 * @param {{ fullName?: string; role?: string }} payload
 */
export async function updateUser(userId, payload) {
  const res = await api.patch(`/admin/users/${userId}`, payload)
  return unwrapData(res)
}

/**
 * @param {string} userId
 * @param {{ password: string }} payload
 */
export async function updateUserPassword(userId, payload) {
  const res = await api.patch(`/admin/users/${userId}/password`, payload)
  return unwrapData(res)
}

/**
 * @param {string} userId
 */
export async function deleteUser(userId) {
  await api.delete(`/admin/users/${userId}`)
}
