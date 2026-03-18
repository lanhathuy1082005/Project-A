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
    <>
      {items.map((item) => (
        <ItemCard
          key={item.availability_id}
          item={item}
          buttonLogic={() => openScanner(item)}
        />
      ))}

      {showScanner && <ItemQRScanner
        pendingItem={pendingItem}
        buttonText="Confirm Borrow"
        confirmScan={confirmBorrow}
        cancelScan={cancelScan}
      />}
    </>
  );
}