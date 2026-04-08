/**
 * Format ISO timestamp → "15/01/2024, 10:30"
 * Trả về "—" nếu value null/undefined
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
 * Chuyển "monday" → "Thứ Hai", v.v.
 */
const DAY_MAP = {
  monday: 'Thứ Hai', tuesday: 'Thứ Ba', wednesday: 'Thứ Tư',
  thursday: 'Thứ Năm', friday: 'Thứ Sáu', saturday: 'Thứ Bảy', sunday: 'Chủ Nhật',
}
export const formatDay = (day) => DAY_MAP[day?.toLowerCase()] ?? day
