import { useState, useEffect, useContext } from 'react'
import { useNavigate, useSearchParams }                      from 'react-router-dom'
import { AuthContext }                      from '../context/AuthContext.jsx'
import { loginApi, logoutApi }                         from '../api/auth.api.js'
import Popup                                          from '../components/LoginSuccessPopup.jsx'

export default function Login() {
  const [searchParams] = useSearchParams()
  const faceToken       = searchParams.get('face_token')
  const mode            = searchParams.get('mode')
  const { user, setUser } = useContext(AuthContext)
  const navigate           = useNavigate()

  const [form,    setForm]    = useState({ id: '', password: '', faceToken: faceToken || null, mode: mode || null })
  const [showFaceLoginSuccessPopup, setShowFaceLoginSuccessPopup] = useState(false)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const isFaceLogin = Boolean(faceToken || mode === 'face')

  useEffect(() => {
    if (user && !showFaceLoginSuccessPopup) {
      navigate('/')
    }

    const prepFaceLogin = async () => {
      if (faceToken) {
        await logoutApi()
      }
    }

    // If there's a face token in the URL, we want to log out any existing session to prepare for face login flow
    prepFaceLogin()
  }, [user, navigate, faceToken, showFaceLoginSuccessPopup])

  useEffect(() => {
    if (!showFaceLoginSuccessPopup) return

    const timer = setTimeout(() => {
      setShowFaceLoginSuccessPopup(false)
      navigate('/')
    }, 1700)

    return () => clearTimeout(timer)
  }, [showFaceLoginSuccessPopup, navigate])

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
      if (isFaceLogin) {
        setShowFaceLoginSuccessPopup(true)
      } else {
        navigate('/')
      }
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
              Student ID / Account
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
              Password
            </label>
            <input
              name="password"
              type="password"          
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
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>

      <Popup
        open={showFaceLoginSuccessPopup}
        title={mode === 'face-registration' ? 'Face Registration Successful' : 'Attendance Check Successful'}
        message={mode === 'face-registration' ? 'Face registration succeeded. Redirecting to home...' : 'Attendance check succeeded. Redirecting to home...'}
      />
    </div>
  )
}
