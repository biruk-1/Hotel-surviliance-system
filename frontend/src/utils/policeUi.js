import { formatDateTime } from './hotel'

/**
 * Parse blacklist-style alert message (see backend alert.service.js).
 * @param {string | undefined} message
 */
export function parseAlertDetailFields(message) {
  const m = typeof message === 'string' ? message : ''
  const scoreMatch = m.match(/Match score:\s*(\d+)\s*%/i)
  const reasonMatch = m.match(/Reason on file:\s*(.+?)(?:\n|$)/i)
  const blacklistMatch = m.match(/Blacklist entry:\s*(.+?)(?:\n|$)/i)
  return {
    matchPercent: scoreMatch ? scoreMatch[1] : null,
    reason: reasonMatch ? reasonMatch[1].trim() : null,
    blacklistLine: blacklistMatch ? blacklistMatch[1].trim() : null,
    rawMessage: m,
  }
}

/** Human-readable stay status for tables */
export function formatStayStatus(status) {
  if (!status) return '—'
  const s = String(status).toLowerCase()
  if (s === 'active') return 'Active'
  if (s === 'checked_out') return 'Checked out'
  if (s === 'cancelled') return 'Cancelled'
  return status
}

/**
 * Primary stay columns from GET /guests (backend lateral join).
 */
export function primaryStayDisplay(guest) {
  const hotel =
    guest.primary_hotel_name ?? guest.primaryHotelName ?? null
  const room = guest.primary_room_number ?? guest.primaryRoomNumber ?? null
  const checkIn = guest.primary_check_in ?? guest.primaryCheckIn ?? null
  const status = guest.primary_stay_status ?? guest.primaryStayStatus ?? null

  const hasAnyStay = Boolean(hotel || room || checkIn || status)

  if (!hasAnyStay) {
    return {
      hotelLabel: 'No active stay',
      room: '—',
      checkIn: '—',
      status: '—',
    }
  }

  return {
    hotelLabel: hotel || 'Unknown',
    room: room || '—',
    checkIn: formatDateTime(checkIn),
    status: formatStayStatus(status),
  }
}
