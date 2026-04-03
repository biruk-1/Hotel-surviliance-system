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
