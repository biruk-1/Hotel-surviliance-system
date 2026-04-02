import axios from 'axios'
import { AUTH_STORAGE } from '../context/storage'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

api.interceptors.request.use((config) => {
  const stored = localStorage.getItem(AUTH_STORAGE.token)
  if (stored) {
    config.headers.Authorization = `Bearer ${stored}`
  }
  return config
})
