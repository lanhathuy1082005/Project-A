import {useContext, useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import ReservationCard from '../components/ReservationCard.jsx';
import ItemQRScanner from '../components/ItemQRScanner.jsx';
import { handleGetAllReservations, handleGetUserReservations, handleReturnItem} from '../api/item.js';
import {AuthContext} from '../context/AuthContext.jsx';

export default function History() {
  const {user} = useContext(AuthContext);
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [pendingReservation, setPendingReservation] = useState(null);
  const [showScanner, setShowScanner] = useState(false);

  const openScanner = (reservation) => {
    setPendingReservation(reservation);
    setShowScanner(true);
  };

    const confirmReturn = async (scannedReservationId) => {
      if (!pendingReservation || !scannedReservationId) return;
      try {
        await handleReturnItem(pendingReservation.id, pendingReservation.item_unit_id, scannedReservationId);

        setShowScanner(false);
        setPendingReservation(null);

        const historyItems =await handleGetUserReservations();
        setReservations(historyItems);
      } catch (e) {
        console.error(e);
      }
  };

  const cancelScan = () => {
    setShowScanner(false);
    setPendingReservation(null);
  };

  useEffect(() => {
    if (!user) {
      navigate("/user-login");
      return;
    }

    const fetchHistory = async () => {
    const historyItems = user.role === 'student'
      ? await handleGetUserReservations()
      : await handleGetAllReservations();
    setReservations(historyItems);
    };

    fetchHistory();
  }, [user, navigate]);

  return (
    <div style={{ padding: '40px 48px' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '8px' }}>Borrowing History</h1>
      <p style={{ color: '#6b7280', marginBottom: '32px' }}>All your past and current item reservations</p>

      {reservations.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: '80px', fontSize: '1.1rem' }}>
          No reservations found.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {reservations.map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              buttonLogic={() => openScanner(reservation)}
            />
          ))}
        </div>
      )}

      {showScanner && <ItemQRScanner
        pendingItem={pendingReservation}
        buttonText="Confirm Return"
        confirmScan={confirmReturn}
        cancelScan={cancelScan}
      />}
    </div>
  );
}