import {useContext, useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import ItemCard from '../components/ItemCard.jsx';
import {handleGetUserHistory, handleGetHistory} from '../api/item.js';
import {AuthContext} from '../context/AuthContext.jsx';

export default function History() {
  const {user} = useContext(AuthContext);
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!user) {
      navigate("/user-login");
      return;
    }
    const fetchHistory = async () => {
      const historyItems = user.role === 'student'
        ? await handleGetUserHistory()
        : await handleGetHistory();
      setItems(historyItems);
    };
    fetchHistory();
  }, [user, navigate]);

  return (
    <>
      {items.map((item) => (
        <ItemCard key={item.item_unit_id} item={item} buttonLogic={null} disabled />
      ))}
    </>
  );
}