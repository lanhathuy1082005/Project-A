import { useState, useEffect, useCallback } from 'react'
import { getFeedbackApi } from '../../api/admin.api.js'
import { useToast } from '../../components/Toast.jsx'
import { formatDate } from '../../utils/format.js'
import Pagination from '../../components/Pagination.jsx'
import Loading from '../../components/Loading.jsx'

export default function FeedbackList() {
  const addToast = useToast()
  const [data, setData] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const LIMIT = 20

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getFeedbackApi(page, LIMIT)
      setData(res.data)
      setTotal(res.total)
    } catch (e) { addToast(e.message, 'error') }
    finally { setLoading(false) }
  }, [page])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <Loading />

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontWeight: 500, marginBottom: '16px' }}>Student Feedback</h2>

      {data.length === 0 ? (
        <p style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', padding: '48px 0' }}>
          No feedback yet.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {data.map(f => (
            <div key={f.id} style={{
              background: 'var(--color-background-primary)',
              border: '0.5px solid var(--color-border-tertiary)',
              borderRadius: '12px', padding: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <strong style={{ fontSize: '14px' }}>{f.user_id}</strong>
                <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>{formatDate(f.created_at)}</span>
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-secondary)' }}>{f.content}</p>
            </div>
          ))}
        </div>
      )}
      <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />
    </div>
  )
}
