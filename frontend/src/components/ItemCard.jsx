export default function ItemCard({ item, buttonLogic }) {
    const { item_name, serial_number, day_of_week, start_time, end_time, course_name, lab_name } = item;

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
            transition: 'box-shadow 0.2s',
        }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>{item_name}</h3>
            <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0', margin: '4px 0' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem', color: '#4b5563', flex: 1 }}>
                <span><strong style={{ color: '#111' }}>Serial:</strong> {serial_number}</span>
                <span><strong style={{ color: '#111' }}>Course:</strong> {course_name}</span>
                <span><strong style={{ color: '#111' }}>Time:</strong> {day_of_week}, {start_time} – {end_time}</span>
                <span><strong style={{ color: '#111' }}>Lab:</strong> {lab_name}</span>
            </div>
            <button
                onClick={buttonLogic}
                style={{
                    marginTop: '12px',
                    padding: '11px',
                    backgroundColor: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '999px',
                    fontWeight: '700',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    width: '100%',
                }}
            >
                Borrow
            </button>
        </div>
    );
}