import { useCallback, useEffect, useMemo, useState } from 'react'
import InlineSpinner from '../../components/common/InlineSpinner'
import {
  assignUserToHotel,
  createHotel,
  listAllHotels,
  listHotelUsers,
} from '../../services/hotelService'
import { listUsers } from '../../services/adminService'
import { getApiErrorMessage } from '../../utils/apiError'
import '../page.css'
import '../hotel/hotel-pages.css'
import './admin-pages.css'

const PHONE_RE = /^\+?[0-9()\-.\s]{7,20}$/

export default function AdminHotelsPage() {
  const [hotels, setHotels] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState(null)

  const [name, setName] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [phone, setPhone] = useState('')
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState(null)
  const [createSuccess, setCreateSuccess] = useState(null)

  const [selectedHotelId, setSelectedHotelId] = useState('')
  const [hotelStaff, setHotelStaff] = useState([])
  const [assignedUsers, setAssignedUsers] = useState([])
  const [assignUserId, setAssignUserId] = useState('')
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignError, setAssignError] = useState(null)

  const createValidation = useMemo(() => {
    const next = {}
    if (name.trim().length < 2) next.name = 'Name must be at least 2 characters.'
    if (addressLine1.trim().length > 500) next.addressLine1 = 'Address cannot exceed 500 characters.'
    if (city.trim().length > 120) next.city = 'City cannot exceed 120 characters.'
    if (country.trim().length > 120) next.country = 'Country cannot exceed 120 characters.'
    if (phone.trim() && !PHONE_RE.test(phone.trim())) {
      next.phone = 'Use 7-20 digits and separators (+, space, -, ., parentheses).'
    }
    return next
  }, [addressLine1, city, country, name, phone])

  const loadHotels = useCallback(async () => {
    setListError(null)
    setLoading(true)
    try {
      const data = await listAllHotels()
      setHotels(data.hotels ?? [])
    } catch (err) {
      setListError(getApiErrorMessage(err, 'Could not load properties'))
      setHotels([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHotels()
  }, [loadHotels])

  const loadStaffPool = useCallback(async () => {
    const data = await listUsers({ role: 'hotel' })
    setHotelStaff(data.users ?? [])
  }, [])

  useEffect(() => {
    loadStaffPool().catch(() => setHotelStaff([]))
  }, [loadStaffPool])

  const loadAssigned = useCallback(async (hotelId) => {
    if (!hotelId) {
      setAssignedUsers([])
      return
    }
    setAssignLoading(true)
    setAssignError(null)
    try {
      const data = await listHotelUsers(hotelId)
      setAssignedUsers(data.users ?? [])
    } catch (err) {
      setAssignError(getApiErrorMessage(err, 'Could not load assignments'))
      setAssignedUsers([])
    } finally {
      setAssignLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedHotelId) loadAssigned(selectedHotelId)
    else setAssignedUsers([])
  }, [selectedHotelId, loadAssigned])

  useEffect(() => {
    if (hotels.length && !selectedHotelId) {
      setSelectedHotelId(hotels[0].id)
    }
  }, [hotels, selectedHotelId])

  const assignedIds = useMemo(() => new Set(assignedUsers.map((u) => u.id)), [assignedUsers])

  const unassignedStaff = useMemo(
    () => hotelStaff.filter((u) => !assignedIds.has(u.id)),
    [hotelStaff, assignedIds],
  )
  const canCreate = !createSubmitting && Object.keys(createValidation).length === 0

  async function handleCreate(e) {
    e.preventDefault()
    setCreateError(null)
    setCreateSuccess(null)
    if (!canCreate) {
      setCreateError('Please correct the highlighted fields before creating a property.')
      return
    }
    setCreateSubmitting(true)
    try {
      const data = await createHotel({
        name: name.trim(),
        addressLine1: addressLine1.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        phone: phone.trim() || undefined,
      })
      setCreateSuccess(`Created “${data.hotel?.name ?? name}”.`)
      setName('')
      setAddressLine1('')
      setCity('')
      setCountry('')
      setPhone('')
      await loadHotels()
      if (data.hotel?.id) setSelectedHotelId(data.hotel.id)
    } catch (err) {
      setCreateError(getApiErrorMessage(err, 'Could not create property'))
    } finally {
      setCreateSubmitting(false)
    }
  }

  async function handleAssign(e) {
    e.preventDefault()
    setAssignError(null)
    if (!selectedHotelId || !assignUserId) {
      setAssignError('Select a property and a user.')
      return
    }
    setAssignLoading(true)
    try {
      await assignUserToHotel(selectedHotelId, assignUserId)
      setAssignUserId('')
      await loadAssigned(selectedHotelId)
      await loadStaffPool()
    } catch (err) {
      setAssignError(getApiErrorMessage(err, 'Assignment failed'))
    } finally {
      setAssignLoading(false)
    }
  }

  return (
    <div className="admin-page hotel-page">
      <div className="page__card" style={{ marginBottom: '1rem' }}>
        <h2 className="page__title">Hotel management</h2>
        <p className="page__text">
          Register properties and link hotel staff accounts so they can operate in the correct scope.
        </p>
      </div>

      <div className="admin-page__grid admin-page__grid--split">
        <div>
          {listError ? (
            <div className="hotel-page-msg hotel-page-msg--error" role="alert">
              {listError}
              <button type="button" className="admin-retry-btn" onClick={loadHotels}>
                Retry
              </button>
            </div>
          ) : null}
          <p className="admin-table-meta">
            {loading
              ? 'Loading properties…'
              : `${hotels.length} propert${hotels.length === 1 ? 'y' : 'ies'} registered`}
          </p>

          <div className="hotel-table-wrap">
            <table className="hotel-table hotel-table--responsive">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>City</th>
                  <th>Country</th>
                  <th>ID</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="hotel-table__empty">
                      <span className="hotel-page-hint--inline">
                        <InlineSpinner size="sm" label="Loading hotels" />
                        Loading properties…
                      </span>
                    </td>
                  </tr>
                ) : hotels.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="hotel-table__empty">
                      No properties yet. Create one using the form.
                    </td>
                  </tr>
                ) : (
                  hotels.map((h) => (
                    <tr key={h.id}>
                      <td data-label="Name">{h.name}</td>
                      <td data-label="City">{h.city ?? '—'}</td>
                      <td data-label="Country">{h.country ?? '—'}</td>
                      <td data-label="ID">
                        <span className="hotel-code" title={h.id}>
                          {h.id.slice(0, 8)}…
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-page__card">
          <h3>New property</h3>
          <form className="admin-form" onSubmit={handleCreate}>
            {createError ? (
              <div className="hotel-page-msg hotel-page-msg--error" role="alert">
                {createError}
              </div>
            ) : null}
            {createSuccess ? (
              <div className="hotel-page-msg" role="status">
                {createSuccess}
              </div>
            ) : null}

            <label className="admin-form__field">
              <span>Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={createSubmitting}
                autoComplete="organization"
                aria-invalid={Boolean(createValidation.name)}
              />
              {createValidation.name ? <p className="admin-form__error">{createValidation.name}</p> : null}
            </label>
            <label className="admin-form__field">
              <span>Address line</span>
              <input
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                disabled={createSubmitting}
                autoComplete="street-address"
                aria-invalid={Boolean(createValidation.addressLine1)}
              />
              {createValidation.addressLine1 ? (
                <p className="admin-form__error">{createValidation.addressLine1}</p>
              ) : null}
            </label>
            <div className="admin-form__row">
              <label className="admin-form__field">
                <span>City</span>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={createSubmitting}
                  autoComplete="address-level2"
                  aria-invalid={Boolean(createValidation.city)}
                />
                {createValidation.city ? <p className="admin-form__error">{createValidation.city}</p> : null}
              </label>
              <label className="admin-form__field">
                <span>Country</span>
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={createSubmitting}
                  autoComplete="country-name"
                  aria-invalid={Boolean(createValidation.country)}
                />
                {createValidation.country ? (
                  <p className="admin-form__error">{createValidation.country}</p>
                ) : null}
              </label>
            </div>
            <label className="admin-form__field">
              <span>Phone</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={createSubmitting}
                autoComplete="tel"
                aria-invalid={Boolean(createValidation.phone)}
              />
              {createValidation.phone ? <p className="admin-form__error">{createValidation.phone}</p> : null}
            </label>
            <button type="submit" className="admin-form__submit" disabled={!canCreate}>
              <span className="admin-form__submit-content">
                {createSubmitting ? <InlineSpinner size="sm" label="Creating hotel" /> : null}
                {createSubmitting ? 'Creating…' : 'Create property'}
              </span>
            </button>
          </form>
        </div>
      </div>

      <div className="admin-page__card admin-page__card--spaced">
        <h3>Assign staff</h3>
        <p className="admin-hint">
          Only accounts with the <strong>hotel</strong> role can be assigned. Create or promote users
          under User management.
        </p>

        <div className="admin-select-hotel">
          <label>
            <span>Property</span>
            <select
              value={selectedHotelId}
              onChange={(e) => setSelectedHotelId(e.target.value)}
              disabled={!hotels.length || assignLoading}
            >
              {hotels.length === 0 ? (
                <option value="">No properties</option>
              ) : (
                hotels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                    {h.city ? ` — ${h.city}` : ''}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>

        {assignError ? (
          <div className="hotel-page-msg hotel-page-msg--error" role="alert">
            {assignError}
          </div>
        ) : null}

        <label className="admin-form__field">
          <span>Currently assigned</span>
          {assignLoading && selectedHotelId ? (
            <p className="admin-hint hotel-page-hint--inline">
              <InlineSpinner size="sm" label="Loading assignments" />
              Loading…
            </p>
          ) : assignedUsers.length === 0 ? (
            <p className="admin-hint">No staff assigned to this property yet.</p>
          ) : (
            <ul className="page__list" style={{ marginTop: '0.35rem' }}>
              {assignedUsers.map((u) => (
                <li key={u.id}>
                  {u.fullName}{' '}
                  <span style={{ color: 'var(--text-dim)' }}>({u.email})</span>
                </li>
              ))}
            </ul>
          )}
        </label>

        <form className="admin-form" onSubmit={handleAssign} style={{ marginTop: '1rem' }}>
          <label className="admin-form__field">
            <span>Add hotel user</span>
            <select
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
              disabled={!selectedHotelId || !unassignedStaff.length || assignLoading}
            >
              <option value="">
                {!unassignedStaff.length
                  ? 'No unassigned hotel users'
                  : 'Select user…'}
              </option>
              {unassignedStaff.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} — {u.email}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="admin-form__submit"
            disabled={!assignUserId || assignLoading || !selectedHotelId}
          >
            <span className="admin-form__submit-content">
              {assignLoading ? <InlineSpinner size="sm" label="Assigning user" /> : null}
              {assignLoading ? 'Saving…' : 'Assign to property'}
            </span>
          </button>
        </form>
      </div>
    </div>
  )
}
