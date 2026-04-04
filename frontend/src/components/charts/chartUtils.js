/**
 * Muted, professional color palette for all charts.
 * No bright blues, purples, or gradients.
 */
export const CHART_COLORS = [
  '#334155', // slate-700
  '#64748b', // slate-500
  '#94a3b8', // slate-400
  '#2d6a4f', // deep green (accent)
  '#475569', // slate-600
  '#b0bec5', // blue-grey-200
]

export const CHART_COLOR_PRIMARY = '#334155'
export const CHART_COLOR_ACCENT  = '#2d6a4f'
export const CHART_COLOR_MUTED   = '#94a3b8'
export const CHART_COLOR_GRID    = '#e2e8f0'
export const CHART_COLOR_TICK    = '#94a3b8'

/**
 * Group an array of objects by day using a date field.
 * Returns the last `days` calendar days (fills gaps with 0).
 *
 * @param {object[]} items
 * @param {string} dateField
 * @param {number} [days=7]
 * @returns {{ date: string; count: number }[]}
 */
export function groupByDay(items, dateField, days = 7) {
  const map = {}
  for (const item of items) {
    const raw = item[dateField]
    if (!raw) continue
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) continue
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    map[label] = (map[label] || 0) + 1
  }
  // Build ordered array for last N days
  const result = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    result.push({ date: label, count: map[label] ?? 0 })
  }
  return result
}

/**
 * Generate placeholder / mock trend data for when real data isn't available.
 * @param {number} [days=7]
 * @param {number} [max=10]
 */
export function mockTrendData(days = 7, max = 10) {
  const result = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    result.push({ date: label, count: Math.floor(Math.random() * max) })
  }
  return result
}
