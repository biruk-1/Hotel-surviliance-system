import axios from 'axios'
import { AUTH_STORAGE } from '../context/storage'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

let onUnauthorized = () => {}
let handling401 = false

export function setUnauthorizedHandler(fn) {
  onUnauthorized = typeof fn === 'function' ? fn : () => {}
}

function isPublicAuthRequest(config) {
  const url = config.url ?? ''
  const method = (config.method ?? 'get').toLowerCase()
  if (method !== 'post') return false
  return url.includes('/auth/login') || url.includes('/auth/register')
}

api.interceptors.request.use((config) => {
  const stored = localStorage.getItem(AUTH_STORAGE.token)
  if (stored) {
    config.headers.Authorization = `Bearer ${stored}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const config = error.config
    if (status === 401 && config && !isPublicAuthRequest(config) && !handling401) {
      handling401 = true
      try {
        onUnauthorized()
      } finally {
        queueMicrotask(() => {
          handling401 = false
        })
      }
    }
    return Promise.reject(error)
  },
)

function assertSuccess(body) {
  if (!body || body.success !== true) {
    const msg = body?.error?.message ?? 'Request failed'
    throw new Error(msg)
  }
}

/**
 * Standard `{ success, data }` responses (no top-level pagination).
 * @template T
 * @param {import('axios').AxiosResponse} response
 * @returns {T}
 */
export function unwrapData(response) {
  const body = response.data
  assertSuccess(body)
  return body.data
}

/**
 * List endpoints that return `{ success, data, pagination }`.
 * @template T
 * @param {import('axios').AxiosResponse} response
 * @returns {{ data: T; pagination?: unknown }}
 */
export function unwrapPaginated(response) {
  const body = response.data
  assertSuccess(body)
  return { data: body.data, pagination: body.pagination }
}
