import { useState, useEffect, useContext } from 'react'
import { useNavigate }                      from 'react-router-dom'
import { AuthContext }                      from '../context/AuthContext.jsx'
import { loginApi }                         from '../api/auth.api.js'

export default function Login() {
  const { user, setUser } = useContext(AuthContext)
  const navigate           = useNavigate()

  const [form,    setForm]    = useState({ id: '', password: '' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (user) navigate('/') }, [user, navigate])

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      console.log(form)
      const data = await loginApi(form)
      setUser(data.user)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display:        'flex',
      justifyContent: 'center',
      alignItems:     'center',
      minHeight:      'calc(100vh - 57px)',
      padding:        '24px',
    }}>
      <div style={{
        background:   'var(--color-background-primary)',
        border:       '0.5px solid var(--color-border-tertiary)',
        borderRadius: '12px',
        padding:      '32px',
        width:        '100%',
        maxWidth:     '360px',
        display:      'flex',
        flexDirection:'column',
        gap:          '16px',
      }}>
        <h2 style={{ margin: 0, fontWeight: 500, fontSize: '20px' }}>Đăng nhập</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Mã sinh viên / Tài khoản
            </label>
            <input
              name="id"
              type="text"
              autoComplete="username"
              value={form.id}
              onChange={handleChange}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Mật khẩu
            </label>
            <input
              name="password"
              type="password"          /* FIX: đổi từ "text" → "password" */
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          {error && (
            <p style={{
              margin: 0, fontSize: '13px', padding: '8px 12px',
              borderRadius: '6px',
              background: 'var(--color-background-danger)',
              color:      'var(--color-text-danger)',
            }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} style={{ marginTop: '4px' }}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  )
}
