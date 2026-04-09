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
    <div style={{ padding: '40px 48px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontWeight: 800, fontSize: '2rem', marginBottom: '6px', color: '#111', margin: 0 }}>
          Student Feedback
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '6px', marginBottom: 0 }}>
          Review feedback submitted by students.
        </p>
      </div>

      {data.length === 0 ? (
        <p style={{ color: '#9ca3af', textAlign: 'center', padding: '48px 0' }}>
          No feedback yet.
        </p>
      ) : (
        <div style={tableCard}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={thStyle}>User ID</th>
                <th style={thStyle}>Feedback</th>
                <th style={thStyle}>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.map(f => (
                <tr key={f.id}>
                  <td style={tdStyle}><span style={idBadge}>#{f.user_id}</span></td>
                  <td style={{ ...tdStyle, maxWidth: '400px', wordBreak: 'break-word' }}>{f.content}</td>
                  <td style={tdStyle}>{formatDate(f.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />
    </div>
  )
}

const thStyle = {
  textAlign: 'left', padding: '12px 16px',
  borderBottom: '1px solid #e5e7eb',
  fontSize: '12px', color: '#6b7280',
  fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
}
const tdStyle = {
  padding: '14px 16px', borderBottom: '1px solid #f3f4f6',
  fontSize: '14px', color: '#374151',
}
const tableCard = { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden' }
const idBadge = { fontSize: '12px', color: '#6b7280', fontWeight: 600 }
