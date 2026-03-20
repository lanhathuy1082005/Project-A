import {useContext, useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import ItemCard from '../components/ItemCard.jsx';
import ItemQRScanner from '../components/ItemQRScanner.jsx';
import {handleBorrowItem, handleGetAvailableItemsForStudent} from '../api/item.js';
import {AuthContext} from '../context/AuthContext.jsx';

export default function Item() {
  const {user} = useContext(AuthContext);
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [pendingItem, setPendingItem] = useState(null);
  const [showScanner, setShowScanner] = useState(false);

  const openScanner = (item) => {
    setPendingItem(item);
    setShowScanner(true);
  };

  const confirmBorrow = async (scannedItemUnitId) => {
    if (!pendingItem || !scannedItemUnitId) return;
    try {

      await handleBorrowItem(
        pendingItem.item_unit_id,
        user.id,
        pendingItem.timetable_id,
        scannedItemUnitId
      );
      setShowScanner(false);
      setPendingItem(null);

      const availableItems = await handleGetAvailableItemsForStudent();
      setItems(availableItems);
    } catch (e) {
      console.error(e);
    }
  };

  const cancelScan = () => {
    setShowScanner(false);
    setPendingItem(null);
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
    <div style={{ padding: '40px 48px' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '8px' }}>Available Items</h1>
      <p style={{ color: '#6b7280', marginBottom: '32px' }}>Items available for borrowing in your current timetable</p>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: '80px', fontSize: '1.1rem' }}>
          No items available at the moment.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {items.map((item) => (
            <ItemCard
              key={item.availability_id}
              item={item}
              buttonLogic={() => openScanner(item)}
            />
          ))}
        </div>
      )}

      {showScanner && <ItemQRScanner
        pendingItem={pendingItem}
        buttonText="Confirm Borrow"
        confirmScan={confirmBorrow}
        cancelScan={cancelScan}
      />}
    </div>
  );
}