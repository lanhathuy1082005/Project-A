import { useState } from "react";
import Popup from "./Popup.jsx";

export default function ItemCard({itemName, itemDescription, itemQuantity}) {
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const onOpen = () => {
        setIsPopupOpen(true);
    };

    return (
        <>
        <div>
            <h2>{itemName}</h2>
            <p>Quantity: {itemQuantity}</p>
            <button onClick={onOpen}>Notes</button>
            <button onClick={() => alert(`You have borrowed: ${itemName}`)}>Borrow</button>
        </div>
        <div>
            <Popup content={itemDescription} isPopupOpen={isPopupOpen} setIsPopupOpen={setIsPopupOpen} />
        </div>
        </>
    );
}