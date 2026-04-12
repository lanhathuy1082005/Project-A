import { useState, useContext } from 'react'
import { AuthContext }          from '../context/AuthContext.jsx'
import { formatDate, fmtUnitId, fmtRsvId } from '../utils/format.js'

export default function ReservationCard({ reservation, onReturn }) {
  const { user } = useContext(AuthContext)
  const {
    id, item_id, item_unit_id, item_name, user_id,
    borrow_date, actual_return_date,
    course_name, lab_name,
  } = reservation

  const isReturned = !!actual_return_date
  const [hovered, setHovered] = useState(false)

  return (
    <div style={{
      backgroundColor: '#fff',
      border:          '1px solid #e5e7eb',
      borderRadius:    '16px',
      padding:         '20px 24px',
      boxShadow:       '0 2px 8px rgba(0,0,0,0.06)',
      transition:      'box-shadow 0.18s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          {/* Item type name as primary title */}
          <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 700, color: '#111' }}>
            {item_name || 'Unknown Item'}
          </h3>
          {/* Formatted IDs as secondary subtitle */}
          <span style={{ fontSize: '11px', color: '#9ca3af', fontFamily: 'monospace' }}>
            {fmtUnitId(item_id, item_unit_id)}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <span style={{
            fontSize: '12px', padding: '4px 12px', borderRadius: '999px', fontWeight: 600,
            backgroundColor: isReturned ? '#dcfce7' : '#fef9c3',
            color:           isReturned ? '#16a34a' : '#a16207',
          }}>
            {isReturned ? 'Returned' : 'Borrowing'}
          </span>
          <span style={{ fontSize: '10px', color: '#d1d5db', fontFamily: 'monospace' }}>
            {fmtRsvId(id)}
          </span>
        </div>
      </div>

      <div style={{
        marginTop: '14px', fontSize: '13px', color: '#4b5563',
        display: 'flex', flexDirection: 'column', gap: '5px',
        borderTop: '1px solid #f0f0f0', paddingTop: '12px',
      }}>
        {user?.role === 'admin' && <span>Borrower: <strong style={{ color: '#111' }}>{user_id}</strong></span>}
        <span>Course: <strong style={{ color: '#111' }}>{course_name}</strong></span>
        <span>Lab: <strong style={{ color: '#111' }}>{lab_name}</strong></span>
        <span>Borrowed: {formatDate(borrow_date)}</span>
        {isReturned && <span>Returned: {formatDate(actual_return_date)}</span>}
      </div>

      {user?.role === 'student' && !isReturned && (
        <button
          onClick={() => onReturn(reservation)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            marginTop:       '14px',
            width:           '100%',
            padding:         '11px',
            borderRadius:    '999px',
            border:          'none',
            backgroundColor: hovered ? '#b91c1c' : '#dc2626',
            color:           '#fff',
            fontWeight:      700,
            fontSize:        '14px',
            cursor:          'pointer',
            transform:       hovered ? 'scale(1.02)' : 'scale(1)',
            transition:      'background-color 0.18s ease, transform 0.18s ease',
          }}
        >
          Return Item
        </button>
      )}
    </div>
  )
}
