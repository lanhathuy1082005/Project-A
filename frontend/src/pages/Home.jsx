import { useState, useContext } from 'react'
import { useNavigate }          from 'react-router-dom'
import { AuthContext }          from '../context/AuthContext.jsx'

export default function Home() {
  const { user }  = useContext(AuthContext)
  const navigate  = useNavigate()
  const [hoveredBtn, setHoveredBtn] = useState(null)

  if (!user) return null

  if (user.role === 'admin') {
    const adminButtons = [
      { label: 'Dashboard →',    path: '/admin/dashboard' },
      { label: 'Class Management →', path: '/admin/classes' },
      { label: 'Inventory →',    path: '/admin/inventory' },
      { label: 'Borrow & Return →', path: '/admin/reservations' },
      { label: 'Verification Panel →', path: '/admin/verification' },
      { label: 'Logs & Reports →', path: '/admin/logs' },
      { label: 'Lab Checklist →', path: '/admin/checklist' },
      { label: 'Feedback →',     path: '/admin/feedback' },
      { label: 'See history →',  path: '/history' },
    ]

    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '100vh', padding: '24px',
      }}>
        <div style={{ width: '100%', maxWidth: '560px' }}>
          <h1 style={{ fontWeight: 800, fontSize: '2rem', marginBottom: '10px', color: '#111' }}>
            Homepage
          </h1>
          <p style={{ fontSize: '1rem', color: '#6b7280', marginBottom: '32px' }}>
            Welcome, <strong style={{ color: '#111' }}>{user.id}</strong>.
          </p>
          <div style={{ display: 'grid', gap: '12px' }}>
            {adminButtons.map(btn => (
              <button
                key={btn.path}
                onClick={() => navigate(btn.path)}
                onMouseEnter={() => setHoveredBtn(btn.path)}
                onMouseLeave={() => setHoveredBtn(null)}
                style={{
                  padding: '14px', borderRadius: '999px',
                  backgroundColor: hoveredBtn === btn.path ? '#b91c1c' : '#dc2626',
                  color: '#fff',
                  border: 'none', fontWeight: 700, fontSize: '15px', cursor: 'pointer',
                  transform: hoveredBtn === btn.path ? 'scale(1.02)' : 'scale(1)',
                  transition: 'background-color 0.18s ease, transform 0.18s ease',
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '100vh', padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '560px' }}>
        <h1 style={{ fontWeight: 800, fontSize: '3rem', marginBottom: '10px', color: '#111', fontFamily: "'Open Sans', sans-serif" }}>
          Homepage
        </h1>
        <p style={{ fontSize: '1rem', color: '#6b7280', marginBottom: '32px' }}>
          Welcome, <strong style={{ color: '#111' }}>{user.id}</strong>. Select a function below:
        </p>
        <div style={{ display: 'grid', gap: '12px' }}>
          <button
            onClick={() => navigate('/items')}
            onMouseEnter={() => setHoveredBtn('items')}
            onMouseLeave={() => setHoveredBtn(null)}
            style={{
              padding: '14px', borderRadius: '999px',
              backgroundColor: hoveredBtn === 'items' ? '#b91c1c' : '#dc2626',
              color: '#fff',
              border: 'none', fontWeight: 700, fontSize: '15px', cursor: 'pointer',
              transform: hoveredBtn === 'items' ? 'scale(1.02)' : 'scale(1)',
              transition: 'background-color 0.18s ease, transform 0.18s ease',
            }}
          >
            Borrow →
          </button>
          <button
            onClick={() => navigate('/history')}
            onMouseEnter={() => setHoveredBtn('history')}
            onMouseLeave={() => setHoveredBtn(null)}
            style={{
              padding: '14px', borderRadius: '999px',
              backgroundColor: hoveredBtn === 'history' ? '#b91c1c' : '#dc2626',
              color: '#fff',
              border: 'none', fontWeight: 700, fontSize: '15px', cursor: 'pointer',
              transform: hoveredBtn === 'history' ? 'scale(1.02)' : 'scale(1)',
              transition: 'background-color 0.18s ease, transform 0.18s ease',
            }}
          >
            See history →
          </button>
        </div>
      </div>
    </div>
  )
}
