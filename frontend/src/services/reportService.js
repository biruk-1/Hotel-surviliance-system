import { api, unwrapData } from './api'

/**
 * @param {Record<string, string | number | undefined>} params Query string params
 */
export async function fetchGuestReport(params) {
  const res = await api.get('/reports/guests', { params })
  return unwrapData(res)
}

export async function fetchBlacklistReport(params) {
  const res = await api.get('/reports/blacklist', { params })
  return unwrapData(res)
}

export async function fetchAlertsReport(params) {
  const res = await api.get('/reports/alerts', { params })
  return unwrapData(res)
}

export async function fetchCombinedReport(params) {
  const res = await api.get('/reports/combined', { params })
  return unwrapData(res)
}
