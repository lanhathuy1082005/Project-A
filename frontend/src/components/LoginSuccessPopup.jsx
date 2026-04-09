import { useEffect } from 'react'

export default function Popup({ open, title, message, duration = 1600, onTimeout }) {
  useEffect(() => {
    if (!open || !onTimeout) return

    const timer = setTimeout(() => {
      onTimeout()
    }, duration)

    return () => clearTimeout(timer)
  }, [open, duration, onTimeout])

  if (!open) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'rgba(0, 0, 0, 0.4)',
      zIndex: 1000,
      padding: '16px',
    }}>
      <div style={{
        maxWidth: '360px',
        width: '100%',
        background: 'var(--color-background-primary)',
        border: '1px solid var(--color-border-tertiary)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.18)',
        textAlign: 'center',
      }}>
        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{title}</h3>
        <p style={{ margin: '12px 0 0', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
          {message}
        </p>
      </div>
    </div>
  )
}
