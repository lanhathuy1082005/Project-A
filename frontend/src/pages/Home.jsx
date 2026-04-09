import { useContext }   from 'react'
import { useNavigate }  from 'react-router-dom'
import { AuthContext }  from '../context/AuthContext.jsx'

export default function Home() {
  const { user }  = useContext(AuthContext)
  const navigate  = useNavigate()

  if (!user) return null   // ProtectedRoute đã handle redirect

  if (user.role === 'admin') {
    return (
      <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ fontWeight: 500, marginBottom: '8px' }}>Admin Panel</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
          Welcome, {user.id}.
        </p>
        <div style={{ display: 'grid', gap: '12px' }}>
          <button onClick={() => navigate('/admin/dashboard')} style={{ width: '100%' }}>Dashboard →</button>
          <button onClick={() => navigate('/admin/classes')} style={{ width: '100%' }}>Class Management →</button>
          <button onClick={() => navigate('/admin/inventory')} style={{ width: '100%' }}>Inventory →</button>
          <button onClick={() => navigate('/admin/reservations')} style={{ width: '100%' }}>Borrow & Return →</button>
          <button onClick={() => navigate('/admin/verification')} style={{ width: '100%' }}>Verification Panel →</button>
          <button onClick={() => navigate('/admin/logs')} style={{ width: '100%' }}>Logs & Reports →</button>
          <button onClick={() => navigate('/admin/checklist')} style={{ width: '100%' }}>Lab Checklist →</button>
          <button onClick={() => navigate('/admin/feedback')} style={{ width: '100%' }}>Feedback →</button>
          <button onClick={() => navigate('/history')} style={{ width: '100%' }}>Reservation History →</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ fontWeight: 500, marginBottom: '8px' }}>Trang chủ</h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
        Xin chào, {user.id}. Chọn chức năng bên dưới:
      </p>
      <div style={{ display: 'grid', gap: '12px' }}>
        <button onClick={() => navigate('/items')}>
          Borrow →
        </button>
        <button onClick={() => navigate('/history')}>
          See history →
        </button>
      </div>
    </div>
  )
}
