import { useHotelScope } from '../../hooks/useHotelScope'
import { getApiErrorMessage } from '../../utils/apiError'
import './hotel-property-bar.css'

export default function HotelPropertyBar() {
  const { hotels, selectedHotelId, setSelectedHotelId, loading, error } = useHotelScope()

  if (loading) {
    return (
      <div className="hotel-bar hotel-bar--muted" role="status">
        Loading properties…
      </div>
    )
  }

  if (error) {
    return (
      <div className="hotel-bar hotel-bar--error" role="alert">
        {getApiErrorMessage(error, 'Could not load your hotel assignments')}
      </div>
    )
  }

  if (!hotels.length) {
    return (
      <div className="hotel-bar hotel-bar--error" role="status">
        No property is assigned to your account. Contact an administrator.
      </div>
    )
  }

  return (
    <div className="hotel-bar">
      <label className="hotel-bar__label" htmlFor="hotel-property-select">
        Property
      </label>
      <select
        id="hotel-property-select"
        className="hotel-bar__select"
        value={selectedHotelId}
        onChange={(e) => setSelectedHotelId(e.target.value)}
      >
        {hotels.map((h) => (
          <option key={h.id} value={h.id}>
            {[h.name, h.city].filter(Boolean).join(' · ') || h.id}
          </option>
        ))}
      </select>
    </div>
  )
}
