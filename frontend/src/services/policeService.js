import { api, unwrapData } from './api'

export async function getPoliceDashboardStats() {
  const res = await api.get('/police/stats')
  return unwrapData(res)
}
