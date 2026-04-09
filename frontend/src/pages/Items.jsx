import { useState, useEffect, useContext } from 'react'
import { useNavigate }                     from 'react-router-dom'
import { AuthContext }                     from '../context/AuthContext.jsx'
import { borrowItemApi }                   from '../api/reservation.api.js'
import QRScanner                           from '../components/QRScanner.jsx'
import { useToast }                        from '../components/Toast.jsx'

export default function Items() {
  const { user }   = useContext(AuthContext)
  const navigate   = useNavigate()
  const [actionError, setActionError] = useState(null)
  const addToast = useToast()

  useEffect(() => {
    if (!user)                  { navigate('/login');  return }
    if (user.role !== 'student'){ navigate('/');       return }
  }, [user, navigate])

  // ── Borrow handlers ────────────────────────────────────────────────────────

  const confirmBorrow = async (scannedId) => {
    if (!scannedId) return
    setActionError(null)
    try {
      await borrowItemApi(scannedId)
      addToast('Item borrowed successfully', 'success')
    } catch (e) {
      setActionError(e.message)
    }
  }

  return (
    <div style={{
      display:        'flex',
      justifyContent: 'center',
      alignItems:     'center',
      height:         '100vh',
    }}>
      <QRScanner
        onResult={confirmBorrow}
        actionError={actionError}
      />
    </div>
  )
}
