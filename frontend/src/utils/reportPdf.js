import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDateTime } from './hotel'

function fmtDob(d) {
  if (!d) return '—'
  if (typeof d === 'string' && d.length >= 10) return d.slice(0, 10)
  return String(d)
}

function fmtIsoCell(v) {
  if (v == null || v === '') return '—'
  try {
    return formatDateTime(v)
  } catch {
    return String(v)
  }
}

function headerBlock(doc, title, subtitleLines, yStart = 12) {
  doc.setFontSize(14)
  doc.setTextColor(20, 30, 50)
  doc.text(title, 14, yStart)
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 90)
  let y = yStart + 6
  subtitleLines.forEach((line) => {
    if (line) {
      doc.text(line, 14, y)
      y += 4
    }
  })
  return y + 4
}

/**
 * @param {object[]} rows
 * @param {{ filters?: object }} meta
 * @param {{ officer?: string; portalLabel?: string }} options
 */
export function downloadGuestReportPdf(rows, meta, options = {}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const subtitle = [
    options.portalLabel ?? '',
    `Generated: ${formatDateTime(new Date().toISOString())}`,
    options.officer ? `Officer / reference: ${options.officer}` : null,
    meta?.filters ? `Filters: ${JSON.stringify(meta.filters)}` : null,
  ]
  let y = headerBlock(doc, 'Guest registrations & stays', subtitle)

  const head = [
    ['Guest name', 'ID number', 'Phone', 'DOB', 'Hotel', 'City', 'Country', 'Room', 'Check-in', 'Check-out', 'Stay status'],
  ]
  const body = rows.map((r) => [
    r.full_name ?? '—',
    r.id_number ?? '—',
    r.phone ?? '—',
    fmtDob(r.date_of_birth),
    r.hotel_name ?? '—',
    r.hotel_city ?? '—',
    r.hotel_country ?? '—',
    r.room_number ?? '—',
    fmtIsoCell(r.check_in),
    fmtIsoCell(r.check_out),
    r.stay_status ?? '—',
  ])

  autoTable(doc, {
    startY: y,
    head,
    body,
    styles: { fontSize: 7, cellPadding: 1 },
    headStyles: { fillColor: [30, 58, 95], textColor: 255 },
    margin: { left: 14, right: 14 },
  })

  doc.save(`guest-report-${Date.now()}.pdf`)
}

export function downloadBlacklistReportPdf(rows, meta, options = {}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const subtitle = [
    options.portalLabel ?? '',
    `Generated: ${formatDateTime(new Date().toISOString())}`,
    options.officer ? `Officer / reference: ${options.officer}` : null,
  ]
  let y = headerBlock(doc, 'Blacklist registry', subtitle)

  const head = [['Name', 'ID number', 'DOB', 'Phone', 'Planned checkout', 'Reason', 'Linked hotel', 'Date added']]
  const body = rows.map((r) => [
    r.full_name ?? '—',
    r.id_number ?? '—',
    fmtDob(r.date_of_birth),
    r.phone ?? '—',
    fmtDob(r.checkout_date),
    (r.reason ?? '—').slice(0, 120),
    r.linked_hotel_name ?? '—',
    fmtIsoCell(r.created_at),
  ])

  autoTable(doc, { startY: y, head, body, styles: { fontSize: 7 }, headStyles: { fillColor: [30, 58, 95] }, margin: { left: 14, right: 14 } })
  doc.save(`blacklist-report-${Date.now()}.pdf`)
}

export function downloadAlertsReportPdf(rows, meta, options = {}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const subtitle = [
    options.portalLabel ?? '',
    `Generated: ${formatDateTime(new Date().toISOString())}`,
    options.officer ? `Officer / reference: ${options.officer}` : null,
  ]
  let y = headerBlock(doc, 'System alerts', subtitle)

  const head = [['Severity', 'Hotel', 'Guest', 'Phone', 'Room', 'Stay in', 'Stay out', 'Title', 'Created', 'Reviewed']]
  const body = rows.map((r) => [
    r.severity ?? '—',
    r.hotel_name ?? '—',
    r.guest_full_name ?? '—',
    r.guest_phone ?? '—',
    r.stay_room_number ?? '—',
    fmtIsoCell(r.stay_check_in),
    fmtIsoCell(r.stay_check_out),
    (r.title ?? '—').slice(0, 60),
    fmtIsoCell(r.created_at),
    r.acknowledged_at ? fmtIsoCell(r.acknowledged_at) : 'Pending',
  ])

  autoTable(doc, { startY: y, head, body, styles: { fontSize: 6 }, headStyles: { fillColor: [30, 58, 95] }, margin: { left: 14, right: 14 } })
  doc.save(`alerts-report-${Date.now()}.pdf`)
}

function tableBottom(doc) {
  return doc.lastAutoTable?.finalY ?? 40
}

export function downloadCombinedReportPdf(data, options = {}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const subtitle = [
    options.portalLabel ?? '',
    `Generated: ${formatDateTime(new Date().toISOString())}`,
    options.officer ? `Officer / reference: ${options.officer}` : null,
  ]
  let y = headerBlock(doc, 'Combined operational report', subtitle)

  doc.setFontSize(10)
  doc.text('Section A — Guest registrations & stays', 14, y)
  y += 6

  const gRows = data.guests?.rows ?? []
  autoTable(doc, {
    startY: y,
    head: [['Guest', 'ID', 'Phone', 'Hotel', 'City', 'Country', 'Room', 'Check-in', 'Status']],
    body: gRows.map((r) => [
      r.full_name ?? '—',
      r.id_number ?? '—',
      r.phone ?? '—',
      r.hotel_name ?? '—',
      r.hotel_city ?? '—',
      r.hotel_country ?? '—',
      r.room_number ?? '—',
      fmtIsoCell(r.check_in),
      r.stay_status ?? '—',
    ]),
    styles: { fontSize: 6 },
    headStyles: { fillColor: [30, 58, 95] },
    margin: { left: 14, right: 14 },
  })

  y = tableBottom(doc) + 10
  if (y > 170) {
    doc.addPage()
    y = 14
  }

  doc.setFontSize(10)
  doc.text('Section B — Blacklist', 14, y)
  y += 6

  const bRows = data.blacklist?.rows ?? []
  autoTable(doc, {
    startY: y,
    head: [['Name', 'ID', 'Reason', 'Date added']],
    body: bRows.map((r) => [r.full_name ?? '—', r.id_number ?? '—', (r.reason ?? '—').slice(0, 80), fmtIsoCell(r.created_at)]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [30, 58, 95] },
    margin: { left: 14, right: 14 },
  })

  y = tableBottom(doc) + 10
  if (y > 160) {
    doc.addPage()
    y = 14
  }

  doc.setFontSize(10)
  doc.text('Section C — Alerts', 14, y)
  y += 6

  const aRows = data.alerts?.rows ?? []
  autoTable(doc, {
    startY: y,
    head: [['Severity', 'Hotel', 'Guest', 'Title', 'Created']],
    body: aRows.map((r) => [
      r.severity ?? '—',
      r.hotel_name ?? '—',
      r.guest_full_name ?? '—',
      (r.title ?? '—').slice(0, 50),
      fmtIsoCell(r.created_at),
    ]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [30, 58, 95] },
    margin: { left: 14, right: 14 },
  })

  doc.save(`combined-report-${Date.now()}.pdf`)
}
