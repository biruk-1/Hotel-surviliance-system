/**
 * @param {unknown[]} stays
 * @param {string} hotelId
 */
export function pickStayForHotel(stays, hotelId) {
  if (!Array.isArray(stays) || !hotelId) return null
  const hid = String(hotelId)
  const forHotel = stays.filter((s) => String(s.hotel_id ?? s.hotelId) === hid)
  const active = forHotel.find((s) => (s.status ?? '') === 'active')
  return active || forHotel[0] || null
}

/**
 * @param {string | undefined} iso
 */
export function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
