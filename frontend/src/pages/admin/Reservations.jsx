import { useState, useEffect, useCallback } from 'react'
import {
  getAdminReservationsApi,
  verifyReturnApi,
  reportIssueApi,
} from '../../api/admin.api.js'
import { useToast } from '../../components/Toast.jsx'
import { formatDate, fmtRsvId, fmtUnitId } from '../../utils/format.js'
import Pagination from '../../components/Pagination.jsx'
import Loading from '../../components/Loading.jsx'

const STATUS_OPTIONS = [
  { value: '',             label: 'All' },
  { value: 'not_returned', label: 'Not Returned' },
  { value: 'overdue',      label: 'Overdue' },
  { value: 'returned',     label: 'Returned' },
]

// Display badge: 3 statuses derived purely from reservation fields
const displayStatus = (r) => {
  if (r.actual_return_date) return { label: 'Returned', bg: '#d1fae5', color: '#047857' }
  const borrowDay = new Date(r.borrow_date)
  borrowDay.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (borrowDay < today) return { label: 'Overdue', bg: '#fee2e2', color: '#991b1b' }
  return { label: 'Borrowed', bg: '#fef3c7', color: '#b45309' }
}

// Show verify/report only when returned but not yet processed (approved IS NULL)
const needsVerification = (r) => !!r.actual_return_date && r.approved === null

export default function Reservations() {
  const addToast = useToast()

  // Separate draft filters (form) from applied filters (used in fetch)
  const emptyFilters = { status: '', user_id: '', class_id: '', date_from: '', date_to: '' }
  const [draftFilters,   setDraftFilters]   = useState(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters)

  const [data,    setData]    = useState([])
  const [page,    setPage]    = useState(1)
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const LIMIT = 20

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const f = {}
      if (appliedFilters.status)           f.status    = appliedFilters.status
      if (appliedFilters.user_id.trim())   f.user_id   = appliedFilters.user_id.trim()
      if (appliedFilters.class_id.trim())  f.class_id  = appliedFilters.class_id.trim()
      if (appliedFilters.date_from)        f.date_from = appliedFilters.date_from
      if (appliedFilters.date_to)          f.date_to   = appliedFilters.date_to
      const res = await getAdminReservationsApi(page, LIMIT, f)
      setData(res.data)
      setTotal(res.total)
    } catch (e) { addToast(e.message, 'error') }
    finally { setLoading(false) }
  }, [page, appliedFilters, addToast])

  // Re-fetch only when page or applied filters change
  useEffect(() => { fetchData() }, [fetchData])

  const applyFilters = () => {
    setPage(1)
    setAppliedFilters({ ...draftFilters })
  }

  const handleVerify = async (id) => {
    try {
      await verifyReturnApi(id)
      addToast('Return verified — item available', 'success')
      fetchData()
    } catch (e) { addToast(e.message, 'error') }
  }

  const handleReport = async (id) => {
    try {
      await reportIssueApi(id)
      addToast('Item marked as Broken', 'info')
      fetchData()
    } catch (e) { addToast(e.message, 'error') }
  }

  if (loading && data.length === 0) return <Loading />

  return (
    <div style={{ padding: '40px 48px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontWeight: 800, fontSize: '2rem', color: '#111', margin: 0 }}>Reservations</h1>
        <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '6px', marginBottom: 0 }}>
          All borrow activity. Use Verify / Report on returned items that need inspection.
        </p>
      </div>

      {/* ── Filters — only applied when button is clicked ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div>
          <label style={labelStyle}>Status</label>
          <select
            value={draftFilters.status}
            onChange={e => setDraftFilters(p => ({ ...p, status: e.target.value }))}
            style={inputStyle}
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Student ID</label>
          <input
            value={draftFilters.user_id}
            onChange={e => setDraftFilters(p => ({ ...p, user_id: e.target.value }))}
            placeholder="User ID"
            style={inputStyle}
            onKeyDown={e => e.key === 'Enter' && applyFilters()}
          />
        </div>
        <div>
          <label style={labelStyle}>Class ID</label>
          <input
            value={draftFilters.class_id}
            onChange={e => setDraftFilters(p => ({ ...p, class_id: e.target.value }))}
            placeholder="Timetable ID"
            style={inputStyle}
            onKeyDown={e => e.key === 'Enter' && applyFilters()}
          />
        </div>
        <div>
          <label style={labelStyle}>From</label>
          <input
            type="date"
            value={draftFilters.date_from}
            onChange={e => setDraftFilters(p => ({ ...p, date_from: e.target.value }))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>To</label>
          <input
            type="date"
            value={draftFilters.date_to}
            onChange={e => setDraftFilters(p => ({ ...p, date_to: e.target.value }))}
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button onClick={applyFilters} style={primaryBtn}>Apply</button>
        </div>
      </div>

      {/* ── Table ── */}
      {data.length === 0 ? (
        <p style={{ color: '#9ca3af', textAlign: 'center', padding: '48px 0' }}>No reservations found.</p>
      ) : (
        <div style={tableCard}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>User</th>
                <th style={thStyle}>Item · Unit</th>
                <th style={thStyle}>Borrow Date</th>
                <th style={thStyle}>Return Date</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map(r => {
                const s = displayStatus(r)
                return (
                  <tr key={r.id}>
                    <td style={tdStyle}>
                      <span style={idBadge}>{fmtRsvId(r.id)}</span>
                    </td>
                    <td style={tdStyle}>{r.user_id}</td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: '#111' }}>{r.item_name}</div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', fontFamily: 'monospace' }}>
                        {fmtUnitId(r.item_id, r.item_unit_id)}
                      </div>
                    </td>
                    <td style={tdStyle}>{formatDate(r.borrow_date)}</td>
                    <td style={tdStyle}>{formatDate(r.actual_return_date)}</td>
                    <td style={tdStyle}>
                      <span style={{ ...statusBadge, background: s.bg, color: s.color }}>{s.label}</span>
                    </td>
                    <td style={tdStyle}>
                      {needsVerification(r) ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleVerify(r.id)} style={verifyBtn}>✔ Verify</button>
                          <button onClick={() => handleReport(r.id)} style={dangerBtn}>⚠ Report</button>
                        </div>
                      ) : (
                        <span style={{ color: '#d1d5db', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />
    </div>
  )
}

const primaryBtn  = { padding: '10px 22px', borderRadius: '999px', backgroundColor: '#dc2626', color: '#fff', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' }
const verifyBtn   = { padding: '7px 14px', borderRadius: '999px', backgroundColor: 'transparent', color: '#047857', border: '1.5px solid #6ee7b7', fontWeight: 600, fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }
const dangerBtn   = { padding: '7px 14px', borderRadius: '999px', backgroundColor: 'transparent', color: '#dc2626', border: '1.5px solid #fca5a5', fontWeight: 600, fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }
const thStyle     = { textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }
const tdStyle     = { padding: '12px 16px', borderBottom: '1px solid #f3f4f6', fontSize: '13px', color: '#374151' }
const tableCard   = { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden' }
const labelStyle  = { display: 'block', fontSize: '13px', color: '#6b7280', fontWeight: 600, marginBottom: '6px' }
const inputStyle  = { width: '100%', padding: '10px 16px', borderRadius: '12px', border: '1.5px solid #e5e7eb', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff' }
const statusBadge = { fontSize: '11px', padding: '3px 10px', borderRadius: '999px', fontWeight: 600 }
const idBadge     = { fontSize: '11px', color: '#6b7280', fontWeight: 600, fontFamily: 'monospace' }
