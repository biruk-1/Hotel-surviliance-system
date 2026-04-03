import { api, unwrapData } from './api'

/**
 * @param {{ email: string; password: string }} credentials
 */
export async function login(credentials) {
  const res = await api.post('/auth/login', credentials)
  return unwrapData(res)
}

/**
 * @param {{ email: string; password: string; fullName: string; role: 'hotel' | 'police' | 'admin' }} payload
 */
export async function register(payload) {
  const res = await api.post('/auth/register', payload)
  return unwrapData(res)
}
