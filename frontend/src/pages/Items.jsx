import { useState, useEffect, useContext } from 'react'
import { useNavigate }                                   from 'react-router-dom'
import { AuthContext }                                   from '../context/AuthContext.jsx'
import { borrowItemApi }                                 from '../api/reservation.api.js'
import QRScanner                                         from '../components/QRScanner.jsx'

export default function Items() {
  const { user }   = useContext(AuthContext)
  const navigate   = useNavigate()
  const [actionError, setActionError] = useState(null)


  useEffect(() => {
    if (!user)                  { navigate('/login');  return }
    if (user.role !== 'student'){ navigate('/');       return }
  }, [user, navigate])

  // ── Borrow handlers ────────────────────────────────────────────────────────

  const confirmBorrow = async (scannedId) => {
    if ( !scannedId) return
    setActionError(null)
    try {
      await borrowItemApi(scannedId)
    } catch (e) {
      setActionError(e.message)
    }
  }


  return (

        <QRScanner
          onResult={confirmBorrow}
          actionError={actionError}
        />  
  )
}
