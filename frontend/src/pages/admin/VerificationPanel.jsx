import { useState, useEffect, useCallback } from 'react'
import { getPendingReturnsApi, verifyReturnApi, reportIssueApi } from '../../api/admin.api.js'
import { useToast } from '../../components/Toast.jsx'
import { formatDate } from '../../utils/format.js'
import Pagination from '../../components/Pagination.jsx'
import Loading from '../../components/Loading.jsx'

export default function VerificationPanel() {
  const addToast = useToast()
  const [data, setData] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const LIMIT = 20

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getPendingReturnsApi(page, LIMIT)
      setData(res.data)
      setTotal(res.total)
    } catch (e) { addToast(e.message, 'error') }
    finally { setLoading(false) }
  }, [page])

  useEffect(() => { fetchData() }, [fetchData])

  const handleVerify = async (id) => {
    try {
      await verifyReturnApi(id)
      addToast('Return verified successfully', 'success')
      fetchData()
    } catch (e) { addToast(e.message, 'error') }
  }

  const handleReport = async (id) => {
    try {
      await reportIssueApi(id)
      addToast('Issue reported, item sent to maintenance', 'info')
      fetchData()
    } catch (e) { addToast(e.message, 'error') }
  }

  if (loading && data.length === 0) return <Loading />

  return (
    <div style={{ padding: '40px 48px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontWeight: 800, fontSize: '2rem', marginBottom: '6px', color: '#111', margin: 0 }}>
          Verification Panel
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '6px', marginBottom: 0 }}>
          Review items pending return verification. Verify or report maintenance issues.
        </p>
      </div>

      {data.length === 0 ? (
        <p style={{ color: '#9ca3af', textAlign: 'center', padding: '48px 0' }}>
          No pending returns.
        </p>
      ) : (
        <div style={tableCard}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={thStyle}>ID</th><th style={thStyle}>User</th>
                <th style={thStyle}>Item</th><th style={thStyle}>Return Date</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map(r => (
                <tr key={r.id}>
                  <td style={tdStyle}><span style={idBadge}>#{r.id}</span></td>
                  <td style={tdStyle}>{r.user_id}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: '#111' }}>{r.item_name}</td>
                  <td style={tdStyle}>{formatDate(r.actual_return_date)}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => handleVerify(r.id)} style={outlineBtn}>✔ Verify</button>
                      <button onClick={() => handleReport(r.id)} style={dangerBtn}>⚠ Report</button>
                    </div>
                  </td>
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

const outlineBtn = {
  padding: '8px 16px', borderRadius: '999px',
  backgroundColor: 'transparent', color: '#374151',
  border: '1.5px solid #e5e7eb', fontWeight: 600,
  fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap',
}
const dangerBtn = {
  padding: '8px 16px', borderRadius: '999px',
  backgroundColor: 'transparent', color: '#dc2626',
  border: '1.5px solid #fca5a5', fontWeight: 600,
  fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap',
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
