/**
 * Format ISO timestamp → "15/01/2024, 10:30"
 * Returns "—" if value is null/undefined
 */
export const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleString('vi-VN', {
        day:    '2-digit',
        month:  '2-digit',
        year:   'numeric',
        hour:   '2-digit',
        minute: '2-digit',
      })
    : '—'

/**
 * Convert "monday" → "Monday", etc.
 */
const DAY_MAP = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
}
export const formatDay = (day) => DAY_MAP[day?.toLowerCase()] ?? day
