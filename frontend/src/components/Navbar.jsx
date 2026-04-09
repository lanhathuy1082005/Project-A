import { useContext }         from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { AuthContext }          from '../context/AuthContext.jsx'
import { logoutApi }            from '../api/auth.api.js'

export default function Navbar() {
  const { user, setUser } = useContext(AuthContext)
  const navigate           = useNavigate()

  const handleLogout = async () => {
    try   { await logoutApi() } catch { /* ignore */ }
    setUser(null)
    navigate('/login')
  }

  return (
    <nav style={{
      display:        'flex',
      alignItems:     'center',
      gap:            '16px',
      padding:        '12px 24px',
      borderBottom:   '0.5px solid var(--color-border-tertiary)',
      fontSize:       '14px',
    }}>
      <span style={{ color: 'var(--color-text-secondary)', marginRight: 'auto' }}>
        Welcome, <strong>{user?.id ?? 'Guest'}</strong>
        {user?.role && (
          <span style={{
            marginLeft: '6px', fontSize: '11px', padding: '2px 6px',
            borderRadius: '4px', background: 'var(--color-background-info)',
            color: 'var(--color-text-info)',
          }}>
            {user.role}
          </span>
        )}
      </span>

      <NavLink to="/">Home</NavLink>

      {user?.role === 'student' && (
        <NavLink to="/items">Borrow Items</NavLink>
      )}

      {user?.role === 'admin' && (
        <>
          <NavLink to="/admin/dashboard">Dashboard</NavLink>
          <NavLink to="/admin/classes">Classes</NavLink>
          <NavLink to="/admin/inventory">Inventory</NavLink>
          <NavLink to="/admin/reservations">Reservations</NavLink>
          <NavLink to="/admin/verification">Verification</NavLink>
          <NavLink to="/admin/logs">Logs</NavLink>
          <NavLink to="/admin/checklist">Checklist</NavLink>
          <NavLink to="/admin/feedback">Feedback</NavLink>
        </>
      )}

      {user && (
        <NavLink to="/history">History</NavLink>
      )}

      {user ? (
        <button onClick={handleLogout}>Logout</button>
      ) : (
        <NavLink to="/login">Login</NavLink>
      )}
    </nav>
  )
}
