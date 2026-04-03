import { api, unwrapData, unwrapPaginated } from './api'

/**
 * Global blacklist (police/admin). Query: page, limit.
 * @param {Record<string, string | number | undefined>} [params]
 */
export async function listBlacklist(params) {
  const res = await api.get('/blacklist', { params })
  return unwrapPaginated(res)
}

/**
 * Police only. Global entry — do not send hotelId.
 * Body: name, idNumber, dateOfBirth, reason (optional)
 */
export async function createBlacklistEntry(body) {
  const res = await api.post('/blacklist', body)
  return unwrapData(res)
}

/**
 * Police/admin. Delete a global blacklist row by id.
 * @param {string} entryId Blacklist row UUID
 */
export async function removeBlacklistEntry(entryId) {
  await api.delete(`/blacklist/${entryId}`)
}
