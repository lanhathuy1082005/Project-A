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
    <>
      {reservations.map((reservation) => (
        <ReservationCard 
          key={reservation.id} 
          reservation={reservation} 
          buttonLogic={() => openScanner(reservation)}
        />
      ))}


      {showScanner && <ItemQRScanner
        pendingItem={pendingReservation}
        buttonText="Confirm Return"
        confirmScan={confirmReturn}
        cancelScan={cancelScan}
      />}
    </>
  );
}