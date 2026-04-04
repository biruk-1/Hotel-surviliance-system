import { api, unwrapData } from './api'

export async function getPoliceDashboardStats() {
  const res = await api.get('/police/stats')
  return unwrapData(res)
}

/** Police: id, name, city, country — for guest search filters */
export async function listPoliceHotels() {
  const res = await api.get('/police/hotels')
  return unwrapData(res)
}
