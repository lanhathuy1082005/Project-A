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
  }, [page, filters])

  useEffect(() => { fetchData() }, [fetchData])

  const applyFilters = () => { setPage(1); fetchData() }

  if (loading && data.length === 0) return <Loading />

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <h2 style={{ fontWeight: 500, marginBottom: '16px' }}>Logs & Reports</h2>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <label style={labelStyle}>Student ID</label>
          <input value={filters.user_id} onChange={e => setFilters(p => ({ ...p, user_id: e.target.value }))} placeholder="User ID" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <label style={labelStyle}>Class ID</label>
          <input value={filters.class_id} onChange={e => setFilters(p => ({ ...p, class_id: e.target.value }))} placeholder="Timetable ID" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <label style={labelStyle}>From</label>
          <input type="date" value={filters.date_from} onChange={e => setFilters(p => ({ ...p, date_from: e.target.value }))} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <label style={labelStyle}>To</label>
          <input type="date" value={filters.date_to} onChange={e => setFilters(p => ({ ...p, date_to: e.target.value }))} />
        </div>
        <button onClick={applyFilters}>Apply</button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>ID</th><th style={thStyle}>User</th>
            <th style={thStyle}>Item</th><th style={thStyle}>Course</th>
            <th style={thStyle}>Lab</th><th style={thStyle}>Borrow Date</th>
            <th style={thStyle}>Return Date</th><th style={thStyle}>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map(r => (
            <tr key={r.id}>
              <td style={tdStyle}>{r.id}</td>
              <td style={tdStyle}>{r.user_id}</td>
              <td style={tdStyle}>{r.item_name}</td>
              <td style={tdStyle}>{r.course_name}</td>
              <td style={tdStyle}>{r.lab_name}</td>
              <td style={tdStyle}>{formatDate(r.borrow_date)}</td>
              <td style={tdStyle}>{formatDate(r.actual_return_date)}</td>
              <td style={tdStyle}>{statusLabel(r)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />
    </div>
  )
}

const thStyle = { textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--color-border-tertiary)', fontSize: '13px', color: 'var(--color-text-secondary)' }
const tdStyle = { padding: '8px 12px', borderBottom: '1px solid var(--color-border-tertiary)', fontSize: '14px' }
const labelStyle = { fontSize: '12px', color: 'var(--color-text-secondary)' }
