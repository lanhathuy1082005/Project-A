import { useState } from 'react'
import { submitFeedbackApi } from '../api/feedback.api.js'
import { useToast } from './Toast.jsx'

export default function FeedbackPopup({ open, onClose }) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const addToast = useToast()

  if (!open) return null

  const handleSubmit = async () => {
    if (!content.trim()) return
    setLoading(true)
    try {
      await submitFeedbackApi(content.trim())
      addToast('Feedback submitted successfully', 'success')
      setContent('')
      onClose()
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex',
      justifyContent: 'center', alignItems: 'center',
      background: 'rgba(0,0,0,0.4)', zIndex: 1000, padding: '16px',
    }}>
      <div style={{
        maxWidth: '420px', width: '100%',
        background: 'var(--color-background-primary)',
        border: '1px solid var(--color-border-tertiary)',
        borderRadius: '12px', padding: '24px',
        display: 'flex', flexDirection: 'column', gap: '12px',
      }}>
        <h3 style={{ margin: 0, fontWeight: 500 }}>Send Feedback</h3>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Share your feedback..."
          rows={4}
          style={{ resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={loading}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading || !content.trim()}>
            {loading ? 'Sending...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}
