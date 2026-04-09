export default function Loading({ text = 'Loading...' }) {
  return (
    <div style={{
      position:        'fixed',
      inset:           0,
      display:         'flex',
      flexDirection:   'column',
      justifyContent:  'center',
      alignItems:      'center',
      gap:             '20px',
      backgroundColor: '#fff',
      zIndex:          9999,
    }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{
        width:        '56px',
        height:       '56px',
        borderRadius: '50%',
        border:       '5px solid #e5e7eb',
        borderTop:    '5px solid #dc2626',
        animation:    'spin 0.8s linear infinite',
      }} />
      {text && (
        <span style={{ fontSize: '15px', color: '#6b7280', fontWeight: 500 }}>
          {text}
        </span>
      )}
    </div>
  )
}
