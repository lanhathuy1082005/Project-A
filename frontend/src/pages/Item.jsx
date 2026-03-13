import {useContext, useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import ItemCard from '../components/ItemCard.jsx';
import {handleBorrowItem, handleGetAvailableItemsForStudent} from '../api/item.js';
import {AuthContext} from '../context/AuthContext.jsx';
import {Scanner} from '@yudiel/react-qr-scanner';

export default function History() {
  const {user} = useContext(AuthContext);
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [scannedItemUnitId, setScannedItemUnitId] = useState(null);
  const [pendingItem, setPendingItem] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [error, setError] = useState(null);

  const openScanner = (item) => {
    setError(null);
    setScannedItemUnitId(null);
    setPendingItem(item);
    setShowScanner(true);
  };

  const handleScan = (results) => {
    if (results?.length > 0) {
      setScannedItemUnitId(results[0].rawValue);
    }
  };

  const confirmBorrow = async () => {
    if (!pendingItem || !scannedItemUnitId) return;
    try {
      await handleBorrowItem(
        pendingItem.item_unit_id,
        user.id,
        pendingItem.timetable_id,
        scannedItemUnitId
      );
      setShowScanner(false);
      setScannedItemUnitId(null);
      setPendingItem(null);
      setError(null);
    } catch (e) {
      setError('Failed to borrow item. Please try again.',e);
    }
  };

  const cancelScan = () => {
    setShowScanner(false);
    setScannedItemUnitId(null);
    setPendingItem(null);
    setError(null);
  };

  useEffect(() => {
    if (!user || user.role !== 'student') {
      navigate("/user-login");
      return;
    }
    const fetchAvailableItems = async () => {
      const availableItems = await handleGetAvailableItemsForStudent();
      setItems(availableItems);
    };
    fetchAvailableItems();
  }, [user, navigate]);

  return (
    <>
      {items.map((item,index) => (
        <ItemCard
          key={index}
          item={item}
          buttonLogic={() => openScanner(item)}
        />
      ))}

      {showScanner && (
        <div>
          <h2>Scan Item QR Code</h2>
          <p>Scanning for: <strong>{pendingItem?.name ?? pendingItem?.item_unit_id}</strong></p>

          {!scannedItemUnitId ? (
            <Scanner
              onScan={handleScan}
              onError={(err) => setError(err?.message ?? 'Camera error')}
            />
          ) : (
            <p>Scanned ID: <strong>{scannedItemUnitId}</strong></p>
          )}

          {error && <p>{error}</p>}

          <button onClick={confirmBorrow} disabled={!scannedItemUnitId}>
            Confirm Borrow
          </button>
          <button onClick={cancelScan}>Cancel</button>
        </div>
      )}
    </>
  );
}