import { useState, useEffect, useCallback } from 'react'
import { getLogsApi } from '../../api/admin.api.js'
import { useToast } from '../../components/Toast.jsx'
import { formatDate } from '../../utils/format.js'
import Pagination from '../../components/Pagination.jsx'
import Loading from '../../components/Loading.jsx'

const statusLabel = (r) => {
  if (r.approved === true) return 'Verified'
  if (r.approved === false) return 'Maintenance'
  if (r.actual_return_date) return 'Return Submitted'
  return 'Borrowed'
}

export default function Logs() {
  const addToast = useToast()
  const [data, setData] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ user_id: '', class_id: '', date_from: '', date_to: '' })
  const LIMIT = 20

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const f = {}
      if (filters.user_id.trim()) f.user_id = filters.user_id.trim()
      if (filters.class_id.trim()) f.class_id = filters.class_id.trim()
      if (filters.date_from) f.date_from = filters.date_from
      if (filters.date_to) f.date_to = filters.date_to
      const res = await getLogsApi(page, LIMIT, f)
      setData(res.data)
      setTotal(res.total)
    } catch (e) { addToast(e.message, 'error') }
    finally { setLoading(false) }
  }, [page, filters, addToast])

  useEffect(() => { fetchData() }, [fetchData])

  const applyFilters = () => { setPage(1); fetchData() }

  if (loading && data.length === 0) return <Loading />

  return (
    <div style={{ padding: '40px 48px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontWeight: 800, fontSize: '2rem', marginBottom: '6px', color: '#111', margin: 0 }}>
          Logs & Reports
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '6px', marginBottom: 0 }}>
          View all borrow and return history with filters.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div>
          <label style={labelStyle}>Student ID</label>
          <input value={filters.user_id} onChange={e => setFilters(p => ({ ...p, user_id: e.target.value }))} placeholder="User ID" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Class ID</label>
          <input value={filters.class_id} onChange={e => setFilters(p => ({ ...p, class_id: e.target.value }))} placeholder="Timetable ID" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>From</label>
          <input type="date" value={filters.date_from} onChange={e => setFilters(p => ({ ...p, date_from: e.target.value }))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>To</label>
          <input type="date" value={filters.date_to} onChange={e => setFilters(p => ({ ...p, date_to: e.target.value }))} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button onClick={applyFilters} style={primaryBtn}>Apply Filters</button>
        </div>
      </div>

      {data.length === 0 ? (
        <p style={{ color: '#9ca3af', textAlign: 'center', padding: '48px 0' }}>No logs found.</p>
      ) : (
        <div style={tableCard}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={thStyle}>ID</th><th style={thStyle}>User</th>
                <th style={thStyle}>Item</th><th style={thStyle}>Course</th>
                <th style={thStyle}>Lab</th><th style={thStyle}>Borrow Date</th>
                <th style={thStyle}>Return Date</th><th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map(r => (
                <tr key={r.id}>
                  <td style={tdStyle}><span style={idBadge}>#{r.id}</span></td>
                  <td style={tdStyle}>{r.user_id}</td>
                  <td style={tdStyle}>{r.item_name}</td>
                  <td style={tdStyle}>{r.course_name}</td>
                  <td style={tdStyle}>{r.lab_name}</td>
                  <td style={tdStyle}>{formatDate(r.borrow_date)}</td>
                  <td style={tdStyle}>{formatDate(r.actual_return_date)}</td>
                  <td style={tdStyle}><span style={{ ...statusBadge, ...statusStyle(r) }}>{statusLabel(r)}</span></td>
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

const statusStyle = (r) => {
  if (r.approved === true) return { backgroundColor: '#d1fae5', color: '#047857' }
  if (r.approved === false) return { backgroundColor: '#fee2e2', color: '#991b1b' }
  if (r.actual_return_date) return { backgroundColor: '#dbeafe', color: '#1e40af' }
  return { backgroundColor: '#fef3c7', color: '#b45309' }
}

const primaryBtn = {
  padding: '10px 22px', borderRadius: '999px',
  backgroundColor: '#dc2626', color: '#fff',
  border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap',
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
const labelStyle = { display: 'block', fontSize: '13px', color: '#6b7280', fontWeight: 600, marginBottom: '6px' }
const inputStyle = { width: '100%', padding: '10px 16px', borderRadius: '12px', border: '1.5px solid #e5e7eb', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff' }
const statusBadge = { fontSize: '12px', padding: '4px 10px', borderRadius: '999px', fontWeight: 600 }
const idBadge = { fontSize: '12px', color: '#6b7280', fontWeight: 600 }
