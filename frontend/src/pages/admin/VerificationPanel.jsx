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
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ fontWeight: 500, marginBottom: '16px' }}>Verification Panel</h2>
      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
        Review items that students have submitted for return. Verify or report issues.
      </p>

      {data.length === 0 ? (
        <p style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', padding: '48px 0' }}>
          No pending returns.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>ID</th><th style={thStyle}>User</th>
              <th style={thStyle}>Item</th><th style={thStyle}>Serial #</th>
              <th style={thStyle}>Return Date</th><th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map(r => (
              <tr key={r.id}>
                <td style={tdStyle}>{r.id}</td>
                <td style={tdStyle}>{r.user_id}</td>
                <td style={tdStyle}>{r.item_name}</td>
                <td style={tdStyle}>{formatDate(r.actual_return_date)}</td>
                <td style={tdStyle}>
                  <button onClick={() => handleVerify(r.id)} style={{ marginRight: '4px' }}>
                    ✔ Verify
                  </button>
                  <button onClick={() => handleReport(r.id)}>
                    ⚠ Report Issue
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />
    </div>
  )
}

const thStyle = { textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--color-border-tertiary)', fontSize: '13px', color: 'var(--color-text-secondary)' }
const tdStyle = { padding: '8px 12px', borderBottom: '1px solid var(--color-border-tertiary)', fontSize: '14px' }
