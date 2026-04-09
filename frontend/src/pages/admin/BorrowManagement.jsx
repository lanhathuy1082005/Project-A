import { useState, useEffect, useCallback } from 'react'
import { getAdminReservationsApi, getReservationDetailApi } from '../../api/admin.api.js'
import { useToast } from '../../components/Toast.jsx'
import { formatDate } from '../../utils/format.js'
import Pagination from '../../components/Pagination.jsx'
import Loading from '../../components/Loading.jsx'

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'borrowed', label: 'Borrowed' },
  { value: 'return_submitted', label: 'Return Submitted' },
  { value: 'verified', label: 'Verified' },
  { value: 'maintenance', label: 'Maintenance' },
]

const statusColor = (r) => {
  if (r.approved === true) return { bg: '#d1fae5', color: '#047857', label: 'Verified' }
  if (r.approved === false) return { bg: '#fee2e2', color: '#991b1b', label: 'Maintenance' }
  if (r.actual_return_date) return { bg: '#dbeafe', color: '#1e40af', label: 'Return Submitted' }
  return { bg: '#fef3c7', color: '#b45309', label: 'Borrowed' }
}

export default function BorrowManagement() {
  const addToast = useToast()
  const [data, setData] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [detail, setDetail] = useState(null)
  const LIMIT = 20

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const filters = {}
      if (statusFilter) filters.status = statusFilter
      if (userFilter.trim()) filters.user_id = userFilter.trim()
      const res = await getAdminReservationsApi(page, LIMIT, filters)
      setData(res.data)
      setTotal(res.total)
    } catch (e) { addToast(e.message, 'error') }
    finally { setLoading(false) }
  }, [page, statusFilter, userFilter, addToast])

  useEffect(() => { fetchData() }, [fetchData])

  const viewDetail = async (id) => {
    try {
      const res = await getReservationDetailApi(id)
      setDetail(res.data)
    } catch (e) { addToast(e.message, 'error') }
  }

  if (loading && data.length === 0) return <Loading />

  return (
    <div style={{ padding: '40px 48px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontWeight: 800, fontSize: '2rem', marginBottom: '6px', color: '#111', margin: 0 }}>
          Borrow & Return Management
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '6px', marginBottom: 0 }}>
          Track all borrowing and return activities across the system.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div>
          <label style={labelStyle}>Filter by Status</label>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} style={inputStyle}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Filter by User ID</label>
          <input
            placeholder="Enter user ID..."
            value={userFilter}
            onChange={e => setUserFilter(e.target.value)}
            onBlur={() => { setPage(1); fetchData() }}
            onKeyDown={e => { if (e.key === 'Enter') { setPage(1); fetchData() } }}
            style={inputStyle}
          />
        </div>
      </div>

      {data.length === 0 ? (
        <p style={{ color: '#9ca3af', textAlign: 'center', padding: '48px 0' }}>No reservations found.</p>
      ) : (
        <div style={tableCard}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={thStyle}>ID</th><th style={thStyle}>User</th>
                <th style={thStyle}>Item</th><th style={thStyle}>Borrow Date</th>
                <th style={thStyle}>Return Date</th><th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map(r => {
                const s = statusColor(r)
                return (
                  <tr key={r.id}>
                    <td style={tdStyle}><span style={idBadge}>#{r.id}</span></td>
                    <td style={tdStyle}>{r.user_id}</td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#111' }}>{r.item_name}</td>
                    <td style={tdStyle}>{formatDate(r.borrow_date)}</td>
                    <td style={tdStyle}>{formatDate(r.actual_return_date)}</td>
                    <td style={tdStyle}>
                      <span style={{ ...statusBadge, background: s.bg, color: s.color }}>
                        {s.label}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <button onClick={() => viewDetail(r.id)} style={outlineBtn}>View Detail</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />

      {detail && (
        <div style={overlayStyle} onClick={() => setDetail(null)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h3 style={modalTitle}>Reservation Detail #{detail.id}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', marginBottom: '20px' }}>
              <div><span style={{ color: '#6b7280' }}>User ID:</span> <strong style={{ color: '#111' }}>{detail.user_id}</strong></div>
              <div><span style={{ color: '#6b7280' }}>Item:</span> <strong style={{ color: '#111' }}>{detail.item_name}</strong></div>
              <div><span style={{ color: '#6b7280' }}>Course:</span> {detail.course_name}</div>
              <div><span style={{ color: '#6b7280' }}>Lab:</span> {detail.lab_name}</div>
              <div><span style={{ color: '#6b7280' }}>Borrow Date:</span> {formatDate(detail.borrow_date)}</div>
              <div><span style={{ color: '#6b7280' }}>Return Date:</span> {formatDate(detail.actual_return_date)}</div>
              <div><span style={{ color: '#6b7280' }}>Status:</span> <strong style={{ color: '#111' }}>{detail.approved === true ? '✓ Verified' : detail.approved === false ? '⚠ Maintenance' : '○ Pending'}</strong></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setDetail(null)} style={outlineBtn}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const outlineBtn = {
  padding: '8px 16px', borderRadius: '999px',
  backgroundColor: 'transparent', color: '#374151',
  border: '1.5px solid #e5e7eb', fontWeight: 600,
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
const overlayStyle = { position: 'fixed', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.65)', zIndex: 1000, padding: '24px' }
const modalStyle = { maxWidth: '480px', width: '100%', backgroundColor: '#fff', borderRadius: '20px', padding: '32px', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', maxHeight: '80vh', overflowY: 'auto' }
const modalTitle = { fontWeight: 800, fontSize: '1.3rem', color: '#111', margin: '0 0 16px' }
const labelStyle = { display: 'block', fontSize: '13px', color: '#6b7280', fontWeight: 600, marginBottom: '6px' }
const inputStyle = { width: '100%', padding: '10px 16px', borderRadius: '12px', border: '1.5px solid #e5e7eb', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff' }
const statusBadge = { fontSize: '12px', padding: '4px 10px', borderRadius: '999px', fontWeight: 600 }
const idBadge = { fontSize: '12px', color: '#6b7280', fontWeight: 600 }
