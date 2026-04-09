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

  console.log(data)
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
      // FIX: refetch dùng đúng role (admin → getAllReservations, student → getMyReservations)
      await refetch()
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
    <div style={{ padding: '24px', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-text-danger)', marginBottom: '12px' }}>{error}</p>
      <button onClick={refetch}>Thử lại</button>
    </div>
  )

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontWeight: 500, marginBottom: '20px' }}>
        {user.role === 'admin' ? 'Tất cả lịch sử mượn đồ' : 'Lịch sử của tôi'}
      </h2>

      {data.length === 0 ? (
        <p style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', padding: '48px 0' }}>
          Chưa có lịch sử mượn đồ nào.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
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

      {pendingReservation && (
        <QRScanner
          pendingLabel={pendingReservation.item_name}
          buttonText="Xác nhận trả"
          onResult={confirmReturn}
          onCancel={cancelScan}
          actionError={actionError}
        />
      )}

      {user?.role === 'student' && (
        <button onClick={() => setShowFeedback(true)} style={{ marginTop: '16px', width: '100%' }}>
          Send Feedback
        </button>
      )}

      <FeedbackPopup open={showFeedback} onClose={() => setShowFeedback(false)} />
    </div>
  )
}
