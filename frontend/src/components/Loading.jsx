export default function Loading({ text = 'Đang tải...' }) {
  return (
    <div style={{
      display:        'flex',
      justifyContent: 'center',
      alignItems:     'center',
      padding:        '48px',
      color:          'var(--color-text-tertiary)',
      fontSize:       '14px',
    }}>
      {text}
    </div>
  )
}
