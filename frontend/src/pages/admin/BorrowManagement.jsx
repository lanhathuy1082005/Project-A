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
  if (r.approved === true) return { bg: 'var(--color-background-success)', color: 'var(--color-text-success)', label: 'Verified' }
  if (r.approved === false) return { bg: 'var(--color-background-danger)', color: 'var(--color-text-danger)', label: 'Maintenance' }
  if (r.actual_return_date) return { bg: 'var(--color-background-info)', color: 'var(--color-text-info)', label: 'Return Submitted' }
  return { bg: 'var(--color-background-warning)', color: 'var(--color-text-warning)', label: 'Borrowed' }
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
  }, [page, statusFilter, userFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const viewDetail = async (id) => {
    try {
      const res = await getReservationDetailApi(id)
      setDetail(res.data)
    } catch (e) { addToast(e.message, 'error') }
  }

  if (loading && data.length === 0) return <Loading />

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ fontWeight: 500, marginBottom: '16px' }}>Borrow & Return Management</h2>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input
          placeholder="Filter by user ID..."
          value={userFilter}
          onChange={e => setUserFilter(e.target.value)}
          onBlur={() => { setPage(1); fetchData() }}
          onKeyDown={e => { if (e.key === 'Enter') { setPage(1); fetchData() } }}
        />
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
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
                <td style={tdStyle}>{r.id}</td>
                <td style={tdStyle}>{r.user_id}</td>
                <td style={tdStyle}>{r.item_name}</td>
                <td style={tdStyle}>{formatDate(r.borrow_date)}</td>
                <td style={tdStyle}>{formatDate(r.actual_return_date)}</td>
                <td style={tdStyle}>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: 500, background: s.bg, color: s.color }}>
                    {s.label}
                  </span>
                </td>
                <td style={tdStyle}>
                  <button onClick={() => viewDetail(r.id)}>Detail</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />

      {detail && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ margin: '0 0 12px' }}>Reservation Detail #{detail.id}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px' }}>
              <span>User: <strong>{detail.user_id}</strong></span>
              <span>Item: <strong>{detail.item_name}</strong></span>
              <span>Course: {detail.course_name}</span>
              <span>Lab: {detail.lab_name}</span>
              <span>Borrow Date: {formatDate(detail.borrow_date)}</span>
              <span>Return Date: {formatDate(detail.actual_return_date)}</span>
              <span>Approved: {detail.approved === true ? 'Yes' : detail.approved === false ? 'Maintenance' : 'Pending'}</span>
            </div>
            <button onClick={() => setDetail(null)} style={{ marginTop: '16px' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}

const thStyle = { textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--color-border-tertiary)', fontSize: '13px', color: 'var(--color-text-secondary)' }
const tdStyle = { padding: '8px 12px', borderBottom: '1px solid var(--color-border-tertiary)', fontSize: '14px' }
const overlayStyle = { position: 'fixed', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.4)', zIndex: 1000, padding: '16px' }
const modalStyle = { maxWidth: '500px', width: '100%', background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: '12px', padding: '24px' }
