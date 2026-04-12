import { useState } from 'react'

export default function Pagination({ page, limit, total, onPageChange }) {
  const [hoveredPrev, setHoveredPrev] = useState(false)
  const [hoveredNext, setHoveredNext] = useState(false)
  const totalPages = Math.ceil(total / limit)
  if (totalPages <= 1) return null



  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      gap:            '12px',
      padding:        '24px 0',
      fontSize:       '14px',
      color:          '#6b7280',
    }}>
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        onMouseEnter={() => setHoveredPrev(true)}
        onMouseLeave={() => setHoveredPrev(false)}
        style={{
          padding:         '8px 20px',
          borderRadius:    '999px',
          border:          'none',
          backgroundColor: page === 1 ? '#e5e7eb' : hoveredPrev ? '#b91c1c' : '#dc2626',
          color:           page === 1 ? '#9ca3af' : '#fff',
          fontWeight:      600,
          fontSize:        '13px',
          cursor:          page === 1 ? 'not-allowed' : 'pointer',
          transition:      'background-color 0.18s ease',
        }}
      >
        ← Prev
      </button>

      <span style={{ fontSize: '13px' }}>
        Page <strong style={{ color: '#111' }}>{page}</strong> / {totalPages}
        <span style={{ color: '#9ca3af', marginLeft: '8px' }}>({total} results)</span>
      </span>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        onMouseEnter={() => setHoveredNext(true)}
        onMouseLeave={() => setHoveredNext(false)}
        style={{
          padding:         '8px 20px',
          borderRadius:    '999px',
          border:          'none',
          backgroundColor: page === totalPages ? '#e5e7eb' : hoveredNext ? '#b91c1c' : '#dc2626',
          color:           page === totalPages ? '#9ca3af' : '#fff',
          fontWeight:      600,
          fontSize:        '13px',
          cursor:          page === totalPages ? 'not-allowed' : 'pointer',
          transition:      'background-color 0.18s ease',
        }}
      >
        Next →
      </button>
    </div>
  )
}
