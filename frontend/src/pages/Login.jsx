import { useState, useEffect, useContext } from 'react'
import { useNavigate, useSearchParams }    from 'react-router-dom'
import { AuthContext }                     from '../context/AuthContext.jsx'
import { loginApi, logoutApi }             from '../api/auth.api.js'
import Popup                               from '../components/LoginSuccessPopup.jsx'
import { TbBox }                           from 'react-icons/tb'

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
  const [hoveredBtn, setHoveredBtn] = useState(false)
  const [hoveredInput, setHoveredInput] = useState(null)
  const [focusedInput, setFocusedInput] = useState(null)

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
      const data = await loginApi({ ...form, id: form.id.trim(), password: form.password.trim() })
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#fff' }}>

      {/* Top header bar */}
      <div style={{
        backgroundColor: '#000',
        padding:         '10px 24px',
        display:         'flex',
        alignItems:      'center',
        gap:             '12px',
      }}>
        <div style={{
          width: '38px', height: '38px',
          backgroundColor: '#fff',
          borderRadius: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <TbBox size={22} color="#000" />
        </div>
        <span style={{ color: '#fff', fontSize: '16px', fontWeight: 600 }}>
          Asia Vietnam lab management system
        </span>
      </div>

      {/* Centered form area */}
      <div style={{
        flex:           1,
        display:        'flex',
        justifyContent: 'center',
        alignItems:     'center',
        padding:        '24px',
      }}>
        <div style={{
          backgroundColor: '#111',
          borderRadius:    '24px',
          padding:         '40px 36px',
          width:           '100%',
          maxWidth:        '340px',
          display:         'flex',
          flexDirection:   'column',
          gap:             '20px',
        }}>
          <h2 style={{ margin: 0, fontWeight: 600, fontSize: '24px', color: '#fff', textAlign: 'center' }}>
            Login
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <input
                name="id"
                type="text"
                placeholder="SWH00000"
                autoComplete="username"
                value={form.id}
                onChange={handleChange}
                required
                onMouseEnter={() => setHoveredInput('id')}
                onMouseLeave={() => setHoveredInput(null)}
                onFocus={() => setFocusedInput('id')}
                onBlur={() => setFocusedInput(null)}
                style={{
                  width: '100%', padding: '13px 20px',
                  borderRadius: '999px',
                  border: focusedInput === 'id' ? '2px solid #dc2626' : '2px solid transparent',
                  backgroundColor: hoveredInput === 'id' || focusedInput === 'id' ? '#f0f0f0' : '#fff',
                  fontSize: '14px',
                  boxSizing: 'border-box', outline: 'none',
                  transition: 'background-color 0.18s ease, border-color 0.18s ease',
                }}
              />
              <p style={{ margin: '5px 0 0', fontSize: '12px', color: '#9ca3af', textAlign: 'right', paddingRight: '6px' }}>
                Enter Student ID
              </p>
            </div>

            <div>
              <input
                name="password"
                type="password"
                placeholder="••••••••••"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                required
                onMouseEnter={() => setHoveredInput('password')}
                onMouseLeave={() => setHoveredInput(null)}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
                style={{
                  width: '100%', padding: '13px 20px',
                  borderRadius: '999px',
                  border: focusedInput === 'password' ? '2px solid #dc2626' : '2px solid transparent',
                  backgroundColor: hoveredInput === 'password' || focusedInput === 'password' ? '#f0f0f0' : '#fff',
                  fontSize: '14px',
                  boxSizing: 'border-box', outline: 'none',
                  transition: 'background-color 0.18s ease, border-color 0.18s ease',
                }}
              />
              <p style={{ margin: '5px 0 0', fontSize: '12px', color: '#9ca3af', textAlign: 'right', paddingRight: '6px' }}>
                Enter Password
              </p>
            </div>

            {error && (
              <p style={{
                margin: 0, fontSize: '13px', padding: '8px 14px',
                borderRadius: '12px',
                background: 'rgba(220,38,38,0.18)',
                color: '#f87171', textAlign: 'center',
              }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              onMouseEnter={() => !loading && setHoveredBtn(true)}
              onMouseLeave={() => setHoveredBtn(false)}
              style={{
                width: '100%', padding: '14px',
                backgroundColor: loading ? '#b91c1c' : hoveredBtn ? '#b91c1c' : '#dc2626',
                color: '#fff', border: 'none',
                borderRadius: '999px',
                fontSize: '16px', fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '4px',
                transform: hoveredBtn && !loading ? 'scale(1.02)' : 'scale(1)',
                transition: 'background-color 0.18s ease, transform 0.18s ease',
              }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>

      <Popup
        open={showFaceLoginSuccessPopup}
        title={mode === 'face-registration' ? 'Face Registration Successful' : 'Attendance Check Successful'}
        message={mode === 'face-registration' ? 'Face registration succeeded. Redirecting to home...' : 'Attendance check succeeded. Redirecting to home...'}
      />
    </div>
  )
}
