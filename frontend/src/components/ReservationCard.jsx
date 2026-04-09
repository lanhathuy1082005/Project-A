import { useContext }  from 'react'
import { AuthContext } from '../context/AuthContext.jsx'
import { formatDate }  from '../utils/format.js'

export default function ReservationCard({ reservation, onReturn }) {
  const { user } = useContext(AuthContext)
  const {
    item_name, user_id,
    borrow_date, actual_return_date,
    course_name, lab_name,
  } = reservation

  const isReturned = !!actual_return_date

  return (
    <div style={{
      background:   'var(--color-background-primary)',
      border:       '0.5px solid var(--color-border-tertiary)',
      borderRadius: '12px',
      padding:      '16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 500 }}>{item_name}</h3>
        </div>
        <span style={{
          fontSize: '11px', padding: '3px 8px', borderRadius: '4px', fontWeight: 500,
          background: isReturned ? 'var(--color-background-success)' : 'var(--color-background-warning)',
          color:      isReturned ? 'var(--color-text-success)'       : 'var(--color-text-warning)',
        }}>
          {isReturned ? 'Returned' : 'Borrowed'}
        </span>
      </div>

      <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {user?.role === 'admin' && <span>User: <strong>{user_id}</strong></span>}
        <span>Course: {course_name}</span>
        <span>Lab Room: {lab_name}</span>
        <span>Borrow Date: {formatDate(borrow_date)}</span>
        {isReturned && <span>Return Date: {formatDate(actual_return_date)}</span>}
      </div>

      {user?.role === 'student' && !isReturned && (
        <button
          onClick={() => onReturn(reservation)}
          style={{ marginTop: '12px', width: '100%' }}
        >
          Trả thiết bị
        </button>
      )}
    </div>
  )
}
