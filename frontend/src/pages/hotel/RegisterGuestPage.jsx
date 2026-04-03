import { useEffect, useState } from 'react'
import { useHotelScope } from '../../hooks/useHotelScope'
import { createGuestWithStay } from '../../services/guestService'
import { getApiErrorMessage } from '../../utils/apiError'
import './hotel-pages.css'

function toIsoFromLocalDatetime(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export default function RegisterGuestPage() {
  const { loading: scopeLoading, error: scopeError, hotels, selectedHotelId } = useHotelScope()
  const [fullName, setFullName] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [hotelId, setHotelId] = useState('')
  const [checkInLocal, setCheckInLocal] = useState('')
  const [roomNumber, setRoomNumber] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (selectedHotelId) setHotelId(selectedHotelId)
  }, [selectedHotelId])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setResult(null)
    const checkIn = toIsoFromLocalDatetime(checkInLocal)
    if (!checkIn) {
      setError('Check-in date and time are required')
      return
    }
    if (!hotelId) {
      setError('Select a property')
      return
    }
    setSubmitting(true)
    try {
      const data = await createGuestWithStay({
        fullName: fullName.trim(),
        idNumber: idNumber.trim(),
        hotelId,
        checkIn,
        roomNumber: roomNumber.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
      })
      setResult(data)
      setFullName('')
      setIdNumber('')
      setRoomNumber('')
      setDateOfBirth('')
      setCheckInLocal('')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Registration failed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (scopeLoading) {
    return <p className="hotel-page-hint">Loading properties…</p>
  }

  if (scopeError) {
    return (
      <div className="hotel-page-msg hotel-page-msg--error" role="alert">
        {getApiErrorMessage(scopeError, 'Could not load properties')}
      </div>
    )
  }

  if (hotels.length === 0) {
    return (
      <p className="hotel-page-msg" role="status">
        No property is assigned to your account. Contact an administrator.
      </p>
    )
  }

  return (
    <div className="hotel-page hotel-form-page">
      <form className="hotel-form" onSubmit={handleSubmit}>
        {error ? (
          <div className="hotel-page-msg hotel-page-msg--error" role="alert">
            {error}
          </div>
        ) : null}

        <label className="hotel-form__field">
          <span>Full name</span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            disabled={submitting}
            autoComplete="name"
          />
        </label>

        <label className="hotel-form__field">
          <span>ID number</span>
          <input
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            required
            disabled={submitting}
          />
        </label>

        <label className="hotel-form__field">
          <span>Property</span>
          <select
            value={hotelId}
            onChange={(e) => setHotelId(e.target.value)}
            required
            disabled={submitting}
          >
            <option value="">Select…</option>
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </label>

        <label className="hotel-form__field">
          <span>Check-in</span>
          <input
            type="datetime-local"
            value={checkInLocal}
            onChange={(e) => setCheckInLocal(e.target.value)}
            required
            disabled={submitting}
          />
        </label>

        <label className="hotel-form__field">
          <span>Room</span>
          <input
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            disabled={submitting}
            placeholder="e.g. 101"
          />
        </label>

        <label className="hotel-form__field">
          <span>Date of birth</span>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            disabled={submitting}
          />
        </label>

        <button type="submit" className="hotel-form__submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Register guest'}
        </button>
      </form>

      {result ? (
        <div className="hotel-result">
          <h3 className="hotel-result__title">Guest registered</h3>
          <p className="hotel-result__text">
            Guest ID: <code className="hotel-code">{result.guest?.id}</code> · Stay ID:{' '}
            <code className="hotel-code">{result.stay?.id}</code>
          </p>
          {result.blacklistCheck ? (
            <div className="hotel-result__flag" role="status">
              <strong>Blacklist check</strong>
              <pre className="hotel-result__pre">
                {JSON.stringify(result.blacklistCheck, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="hotel-result__muted">No blacklist match flagged for this registration.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
