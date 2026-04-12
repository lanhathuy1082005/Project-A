import { useState, useContext }             from 'react'
import { useNavigate }                       from 'react-router-dom'
import { AuthContext }                       from '../context/AuthContext.jsx'
import { returnItemApi }                     from '../api/reservation.api.js'
import { useReservations }                   from '../hooks/useReservations.js'
import ReservationCard                       from '../components/ReservationCard.jsx'
import QRScanner                             from '../components/QRScanner.jsx'
import Pagination                            from '../components/Pagination.jsx'
import Loading                               from '../components/Loading.jsx'
import FeedbackPopup                         from '../components/FeedbackPopup.jsx'
import { useToast }                          from '../components/Toast.jsx'

export default function History() {
  const { user }   = useContext(AuthContext)
  const navigate   = useNavigate()

  const { data, page, setPage, total, limit, loading, error, refetch } =
    useReservations(user?.role)

  const [pendingReservation, setPendingReservation] = useState(null)
  const [actionError,        setActionError]        = useState(null)
  const [showFeedback,       setShowFeedback]       = useState(false)
  const addToast = useToast()

  if (!user) { navigate('/login'); return null }

  // ── Return handlers ────────────────────────────────────────────────────────
  const openScanner = (reservation) => {
    setActionError(null)
    setPendingReservation(reservation)
  }

  const confirmReturn = async (scannedId) => {
    if (!pendingReservation || !scannedId) return
    setActionError(null)
    try {
      await returnItemApi(
        pendingReservation.id,
        pendingReservation.item_unit_id,
        scannedId
      )
      setPendingReservation(null)
      addToast('Item returned successfully', 'success')
      await refetch()
      // Show feedback popup after a successful return
      setShowFeedback(true)
    } catch (e) {
      setActionError(e.message)
    }
  }

  const cancelScan = () => {
    setPendingReservation(null)
    setActionError(null)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return <Loading />

  if (error) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#f87171', marginBottom: '16px' }}>{error}</p>
        <button onClick={refetch} style={{
          padding: '10px 28px', borderRadius: '999px',
          backgroundColor: '#dc2626', color: '#fff',
          border: 'none', fontWeight: 700, cursor: 'pointer',
        }}>Retry</button>
      </div>
    </div>
  )

  return (
    <div style={{ padding: '40px 48px' }}>
      <h1 style={{ fontWeight: 800, fontSize: '2rem', marginBottom: '6px', color: '#111', fontFamily: "'Open Sans', sans-serif" }}>
        {user.role === 'admin' ? 'All Borrow History' : 'My History'}
      </h1>
      <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '28px' }}>
        {user.role === 'admin' ? 'All reservation records in the system.' : 'Your personal borrowing records.'}
      </p>

      {data.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '64px 0',
          color: '#9ca3af', fontSize: '15px',
        }}>
          No reservation records found.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '14px' }}>
          {data.map(r => (
            <ReservationCard
              key={r.id}
              reservation={r}
              onReturn={openScanner}
            />
          ))}
        </div>
      )}

      <Pagination
        page={page}
        limit={limit}
        total={total}
        onPageChange={setPage}
      />

      {/* QR Scanner modal for returns */}
      {pendingReservation && (
        <div
          onClick={cancelScan}
          style={{
            position:        'fixed',
            inset:           0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            zIndex:          200,
            display:         'flex',
            justifyContent:  'center',
            alignItems:      'center',
            padding:         '24px',
          }}
        >
          <div onClick={e => e.stopPropagation()}>
            <QRScanner
              pendingLabel={pendingReservation.item_name}
              buttonText="Confirm Return"
              onResult={confirmReturn}
              onCancel={cancelScan}
              actionError={actionError}
            />
          </div>
        </div>
      )}

      {/* Feedback popup — shown automatically after a successful return */}
      <FeedbackPopup open={showFeedback} onClose={() => setShowFeedback(false)} />
    </div>
  )
}
