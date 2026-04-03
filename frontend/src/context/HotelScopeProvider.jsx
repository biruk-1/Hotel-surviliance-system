import { useCallback, useEffect, useMemo, useState } from 'react'
import { getMyHotels } from '../services/hotelService'
import { HotelScopeContext } from './hotel-scope-context'

const STORAGE_KEY = 'hotelSelectedPropertyId'

export function HotelScopeProvider({ children }) {
  const [hotels, setHotels] = useState([])
  const [selectedHotelId, setSelectedHotelIdState] = useState(
    () => localStorage.getItem(STORAGE_KEY) ?? '',
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const setSelectedHotelId = useCallback((id) => {
    setSelectedHotelIdState(id)
    if (id) localStorage.setItem(STORAGE_KEY, id)
    else localStorage.removeItem(STORAGE_KEY)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError(null)
      setLoading(true)
      try {
        const data = await getMyHotels()
        const list = data?.hotels ?? []
        if (cancelled) return
        setHotels(list)
        if (list.length === 0) {
          setSelectedHotelIdState('')
          localStorage.removeItem(STORAGE_KEY)
        } else {
          const stored = localStorage.getItem(STORAGE_KEY)
          const valid = stored && list.some((h) => h.id === stored)
          if (valid) {
            setSelectedHotelIdState(stored)
          } else {
            setSelectedHotelIdState(list[0].id)
            localStorage.setItem(STORAGE_KEY, list[0].id)
          }
        }
      } catch (e) {
        if (!cancelled) setError(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const selectedHotel = useMemo(
    () => hotels.find((h) => h.id === selectedHotelId) ?? null,
    [hotels, selectedHotelId],
  )

  const value = useMemo(
    () => ({
      hotels,
      selectedHotelId,
      setSelectedHotelId,
      selectedHotel,
      loading,
      error,
    }),
    [hotels, selectedHotelId, setSelectedHotelId, selectedHotel, loading, error],
  )

  return <HotelScopeContext.Provider value={value}>{children}</HotelScopeContext.Provider>
}
