import { useContext } from "react";
import { AuthContext } from "../context/AuthContext.jsx";

export default function ReservationCard({ reservation, buttonLogic }) {
    const {user} = useContext(AuthContext);
    const { item_name, serial_number, user_id, borrow_date, actual_return_date, course_name, lab_name } = reservation;
    const isReturned = actual_return_date !== null;

    const formatDate = (dateStr) => {
        if (!dateStr) return null;
        return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div style={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>{item_name}</h3>
                <span style={{
                    fontSize: '0.75rem', fontWeight: '700', padding: '3px 10px',
                    borderRadius: '999px',
                    backgroundColor: isReturned ? '#dcfce7' : '#fef9c3',
                    color: isReturned ? '#16a34a' : '#a16207',
                }}>
                    {isReturned ? 'Returned' : 'Borrowed'}
                </span>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0', margin: '2px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem', color: '#4b5563', flex: 1 }}>
                <span><strong style={{ color: '#111' }}>Serial:</strong> {serial_number}</span>
                {user.role === 'admin' && <span><strong style={{ color: '#111' }}>User:</strong> {user_id}</span>}
                <span><strong style={{ color: '#111' }}>Course:</strong> {course_name}</span>
                <span><strong style={{ color: '#111' }}>Lab:</strong> {lab_name}</span>
                <span><strong style={{ color: '#111' }}>Borrowed:</strong> {formatDate(borrow_date)}</span>
                {isReturned && <span><strong style={{ color: '#111' }}>Returned:</strong> {formatDate(actual_return_date)}</span>}
            </div>

            <button
                onClick={() => buttonLogic(reservation.id)}
                disabled={isReturned}
                style={{
                    marginTop: '12px',
                    padding: '11px',
                    backgroundColor: isReturned ? '#e5e7eb' : '#dc2626',
                    color: isReturned ? '#9ca3af' : '#fff',
                    border: 'none',
                    borderRadius: '999px',
                    fontWeight: '700',
                    fontSize: '0.95rem',
                    cursor: isReturned ? 'not-allowed' : 'pointer',
                    width: '100%',
                }}
            >
                {isReturned ? 'Returned' : 'Return Item'}
            </button>
        </div>
    );
}