import { api } from './api'

/**
 * @param {{ email: string; password: string }} credentials
 */
export async function loginRequest(credentials) {
  const { data } = await api.post('/auth/login', credentials)
  if (!data?.success || !data?.data?.token || !data?.data?.user) {
    throw new Error('Unexpected response from server')
  }
  return data.data
}
