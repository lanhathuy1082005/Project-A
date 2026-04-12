import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext.jsx'

export default function Home() {
  const { user } = useContext(AuthContext)
  const navigate = useNavigate()
  const [hoveredBtn, setHoveredBtn] = useState(null)

    useEffect(() => {
    if (user?.role === 'admin' && location.pathname === '/') {
      navigate('/admin/dashboard')
    }
  }, [user, navigate])

  if (!user|| user.role !== 'student') return null

  const studentButtons = [
    { label: 'Borrow →', path: '/items' },
    { label: 'See history →', path: '/history' },
  ]

  // Resolver function (this is the key part)
  const getButtonsByRole = (role) => {
    switch (role) {
      case 'student':
        return studentButtons
      default:
        return []
    }
  }

  const buttons = getButtonsByRole(user.role)

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '560px' }}>

        {user.role === 'student' &&
        <h1 style={{
          fontWeight: 800,
          fontSize: '3rem',
          marginBottom: '10px',
          color: '#111',
        }}>
          Homepage
        </h1>}

        <p style={{
          fontSize: '1rem',
          color: '#6b7280',
          marginBottom: '32px'
        }}>
          Welcome, <strong style={{ color: '#111' }}>{user.id}</strong>.
          {user.role === 'student' && ' Select a function below:'}
        </p>

        <div style={{ display: 'grid', gap: '12px' }}>
          {buttons.map(btn => (
            <button
              key={btn.path}
              onClick={() => navigate(btn.path)}
              onMouseEnter={() => setHoveredBtn(btn.path)}
              onMouseLeave={() => setHoveredBtn(null)}
              style={{
                padding: '14px',
                borderRadius: '999px',
                backgroundColor: hoveredBtn === btn.path ? '#b91c1c' : '#dc2626',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                fontSize: '15px',
                cursor: 'pointer',
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