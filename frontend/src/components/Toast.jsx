import { useState, useEffect, useCallback, createContext, useContext } from 'react'

const ToastContext = createContext(null)

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div style={{
        position: 'fixed', top: '16px', right: '16px', zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: '8px',
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            padding: '12px 20px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            pointerEvents: 'auto',
            background: t.type === 'success' ? 'var(--color-background-success, #d4edda)' :
                         t.type === 'error'   ? 'var(--color-background-danger, #f8d7da)' :
                                                'var(--color-background-info, #d1ecf1)',
            color: t.type === 'success' ? 'var(--color-text-success, #155724)' :
                   t.type === 'error'   ? 'var(--color-text-danger, #721c24)' :
                                          'var(--color-text-info, #0c5460)',
            border: '1px solid',
            borderColor: t.type === 'success' ? 'var(--color-border-success, #c3e6cb)' :
                         t.type === 'error'   ? 'var(--color-border-danger, #f5c6cb)' :
                                                'var(--color-border-info, #bee5eb)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
