import { useContext } from "react";
import { AuthContext } from "../context/AuthContext.jsx";

export default function ItemCard({ reservation, buttonLogic }) {
    const {user} = useContext(AuthContext)
    const { item_name, serial_number, user_id, borrow_date, actual_return_date, course_name, lab_name } = reservation;

    return (
        <div>
            <h3>{item_name}</h3>
            <p>Serial Number: {serial_number}</p>
            {user.role == 'admin' && <p>User: {user_id}</p>} 
            <p>Course: {course_name}</p>
            <p>Borrow Date: {borrow_date}</p>
            {actual_return_date && <p>Actual Return Date: {actual_return_date}</p>}
            <p>From Lab: {lab_name}</p>
            <button onClick={() => buttonLogic(reservation.id)} disabled={reservation.actual_return_date !== null}>
                {actual_return_date ? 'Returned' : 'Return'}
            </button>
        </div>
    );
}