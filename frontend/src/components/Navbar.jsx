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
        Xin chào, <strong>{user?.id ?? 'Khách'}</strong>
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

      <NavLink to="/">Trang chủ</NavLink>

      {user?.role === 'student' && (
        <NavLink to="/items">Mượn đồ</NavLink>
      )}

      {user && (
        <NavLink to="/history">Lịch sử</NavLink>
      )}

      {user ? (
        <button onClick={handleLogout}>Đăng xuất</button>
      ) : (
        <NavLink to="/login">Đăng nhập</NavLink>
      )}
    </nav>
  )
}
