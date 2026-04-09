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
        <h2 style={{ fontWeight: 500, marginBottom: '8px' }}>Trang quản trị</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
          Xin chào, {user.id}.
        </p>
        <button onClick={() => navigate('/history')} style={{ width: '100%' }}>
          See history →
        </button>
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
