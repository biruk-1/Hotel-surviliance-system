import { useContext } from 'react'
import { HotelScopeContext } from '../context/hotel-scope-context'

export function useHotelScope() {
  const ctx = useContext(HotelScopeContext)
  if (!ctx) {
    throw new Error('useHotelScope must be used within HotelScopeProvider')
  }
  return ctx
}
