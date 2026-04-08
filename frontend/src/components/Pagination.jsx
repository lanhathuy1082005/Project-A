/**
 * Props:
 *   page        — trang hiện tại (1-indexed)
 *   limit       — số item mỗi trang
 *   total       — tổng số item
 *   onPageChange — callback(newPage)
 */
export default function Pagination({ page, limit, total, onPageChange }) {
  const totalPages = Math.ceil(total / limit)
  if (totalPages <= 1) return null

  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      gap:            '12px',
      padding:        '16px 0',
      fontSize:       '14px',
      color:          'var(--color-text-secondary)',
    }}>
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        style={{ cursor: page === 1 ? 'not-allowed' : 'pointer' }}
      >
        ← Trước
      </button>

      <span>
        Trang <strong>{page}</strong> / {totalPages}
        <span style={{ color: 'var(--color-text-tertiary)', marginLeft: '8px' }}>
          ({total} kết quả)
        </span>
      </span>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        style={{ cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
      >
        Tiếp →
      </button>
    </div>
  )
}
