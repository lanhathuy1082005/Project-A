import { useState, useEffect, useCallback } from 'react'
import { getLabsApi, getLabChecklistApi, updateItemUnitApi } from '../../api/admin.api.js'
import { useToast } from '../../components/Toast.jsx'
import { fmtUnitId } from '../../utils/format.js'
import Loading from '../../components/Loading.jsx'

// Borrowed is managed by the reservation system — admins can set the other three
const STATUSES = ['Available', 'Needs Checking', 'Broken']

const statusStyle = (status) => {
  if (status === 'Available')      return { backgroundColor: '#d1fae5', color: '#047857' }
  if (status === 'Borrowed')       return { backgroundColor: '#fef9c3', color: '#a16207' }
  if (status === 'Needs Checking') return { backgroundColor: '#fef3c7', color: '#b45309' }
  if (status === 'Broken')         return { backgroundColor: '#fee2e2', color: '#dc2626' }
  return { backgroundColor: '#f3f4f6', color: '#6b7280' }
}

export default function LabChecklist() {
  const addToast = useToast()
  const [labs,           setLabs]           = useState([])
  const [selectedLab,    setSelectedLab]    = useState(null)
  const [checklist,      setChecklist]      = useState([])
  const [loading,        setLoading]        = useState(false)
  const [savingId,       setSavingId]       = useState(null) // unit id currently being saved
  const [globalSummary,  setGlobalSummary]  = useState([])
  const [summaryLoading, setSummaryLoading] = useState(true)

  // Build the global alert panel by fetching every lab's checklist on mount
  const buildSummary = useCallback(async (labList) => {
    const results = await Promise.all(
      labList.map(l =>
        getLabChecklistApi(l.id)
          .then(r => ({ lab: l, items: r.data }))
          .catch(() => ({ lab: l, items: [] }))
      )
    )
    const summary = results
      .map(({ lab, items }) => ({
        labId:         lab.id,
        labName:       lab.name,
        needsChecking: items.filter(i => i.status === 'Needs Checking'),
        broken:        items.filter(i => i.status === 'Broken'),
      }))
      .filter(s => s.needsChecking.length > 0 || s.broken.length > 0)
    setGlobalSummary(summary)
  }, [])

  useEffect(() => {
    const init = async () => {
      setSummaryLoading(true)
      try {
        const labRes  = await getLabsApi()
        const labList = labRes.data
        setLabs(labList)
        await buildSummary(labList)
      } catch (e) {
        addToast(e.message, 'error')
      } finally {
        setSummaryLoading(false)
      }
    }
    init()
  }, [addToast, buildSummary])

  const loadChecklist = async (labId) => {
    setSelectedLab(labId)
    setLoading(true)
    try {
      const res = await getLabChecklistApi(labId)
      setChecklist(res.data)
    } catch (e) { addToast(e.message, 'error') }
    finally { setLoading(false) }
  }

  // Inline status change — updates the row instantly, persists, then refreshes summary
  const handleStatusChange = async (unit, newStatus) => {
    // Optimistic local update
    setChecklist(prev => prev.map(c => c.id === unit.id ? { ...c, status: newStatus } : c))
    setSavingId(unit.id)
    try {
      await updateItemUnitApi(unit.id, {
        item_id: unit.item_id,
        lab_id:  unit.lab_id,
        status:  newStatus,
      })
      addToast('Status updated', 'success')
      // Refresh the global alert panel to reflect the change
      await buildSummary(labs)
    } catch (e) {
      // Roll back on failure
      setChecklist(prev => prev.map(c => c.id === unit.id ? { ...c, status: unit.status } : c))
      addToast(e.message, 'error')
    } finally {
      setSavingId(null)
    }
  }

  // Per-selected-lab counts
  const needsCheckingCount = checklist.filter(c => c.status === 'Needs Checking').length
  const brokenCount        = checklist.filter(c => c.status === 'Broken').length

  // Global totals
  const totalNeedsChecking = globalSummary.reduce((acc, s) => acc + s.needsChecking.length, 0)
  const totalBroken        = globalSummary.reduce((acc, s) => acc + s.broken.length, 0)

  return (
    <div style={{ padding: '40px 48px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontWeight: 800, fontSize: '2rem', color: '#111', margin: 0 }}>
          Lab Checklist
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '6px', marginBottom: 0 }}>
          View and update device status per lab. Items marked <em>Needs Checking</em> can still be borrowed; <em>Broken</em> cannot.
        </p>
      </div>

      {/* ── Global alert panel ─────────────────────────────────────────────── */}
      {summaryLoading ? (
        <div style={{ marginBottom: '28px', padding: '20px 24px', borderRadius: '16px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', color: '#9ca3af', fontSize: '13px' }}>
          Loading overview…
        </div>
      ) : globalSummary.length === 0 ? (
        <div style={{ marginBottom: '28px', padding: '16px 20px', borderRadius: '16px', border: '1px solid #d1fae5', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '16px' }}>✓</span>
          <span style={{ fontSize: '14px', color: '#047857', fontWeight: 600 }}>All devices across all labs are in good condition.</span>
        </div>
      ) : (
        <div style={{ marginBottom: '28px', borderRadius: '16px', border: '1px solid #e5e7eb', backgroundColor: '#fff', overflow: 'hidden' }}>
          {/* Header with global totals */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#92400e' }}>⚠ Devices Requiring Attention</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {totalNeedsChecking > 0 && (
                <span style={{ fontSize: '12px', padding: '3px 12px', borderRadius: '999px', backgroundColor: '#fef3c7', color: '#b45309', fontWeight: 700 }}>
                  {totalNeedsChecking} Needs Checking
                </span>
              )}
              {totalBroken > 0 && (
                <span style={{ fontSize: '12px', padding: '3px 12px', borderRadius: '999px', backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: 700 }}>
                  {totalBroken} Broken
                </span>
              )}
            </div>
          </div>

          {/* Per-lab rows */}
          {globalSummary.map((s, idx) => (
            <div
              key={s.labId}
              style={{
                padding: '14px 20px',
                borderBottom: idx < globalSummary.length - 1 ? '1px solid #f3f4f6' : 'none',
                display: 'flex', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap',
              }}
            >
              <button
                onClick={() => loadChecklist(s.labId)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 700, fontSize: '13px', color: '#111', minWidth: '110px', textAlign: 'left', textDecoration: 'underline', textUnderlineOffset: '2px', whiteSpace: 'nowrap' }}
              >
                {s.labName}
              </button>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
                {s.needsChecking.map(item => (
                  <span key={item.id} style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '999px', backgroundColor: '#fef3c7', color: '#92400e', fontWeight: 600 }}>
                    {item.item_name}&nbsp;<span style={{ opacity: 0.6, fontFamily: 'monospace' }}>{fmtUnitId(item.item_id, item.id)}</span>
                  </span>
                ))}
                {s.broken.map(item => (
                  <span key={item.id} style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '999px', backgroundColor: '#fee2e2', color: '#991b1b', fontWeight: 600 }}>
                    {item.item_name}&nbsp;<span style={{ opacity: 0.6, fontFamily: 'monospace' }}>{fmtUnitId(item.item_id, item.id)}</span>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                {s.needsChecking.length > 0 && (
                  <span style={{ fontSize: '12px', color: '#b45309', fontWeight: 700 }}>{s.needsChecking.length} checking</span>
                )}
                {s.needsChecking.length > 0 && s.broken.length > 0 && (
                  <span style={{ fontSize: '12px', color: '#d1d5db' }}>·</span>
                )}
                {s.broken.length > 0 && (
                  <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: 700 }}>{s.broken.length} broken</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Select Lab ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '28px' }}>
        <label style={labelStyle}>Select Lab</label>
        <select
          value={selectedLab || ''}
          onChange={e => loadChecklist(parseInt(e.target.value))}
          style={selectStyle}
        >
          <option value="">Choose a lab…</option>
          {labs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      {loading && <Loading />}

      {!loading && selectedLab && checklist.length === 0 && (
        <p style={{ color: '#9ca3af', textAlign: 'center', padding: '48px 0' }}>No items found in this lab.</p>
      )}

      {!loading && checklist.length > 0 && (
        <>
          {/* Per-lab summary row */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>
              Total: <strong style={{ color: '#111' }}>{checklist.length}</strong>
            </span>
            {needsCheckingCount > 0 && (
              <span style={{ fontSize: '13px', padding: '2px 10px', borderRadius: '999px', backgroundColor: '#fef3c7', color: '#b45309', fontWeight: 600 }}>
                {needsCheckingCount} Needs Checking
              </span>
            )}
            {brokenCount > 0 && (
              <span style={{ fontSize: '13px', padding: '2px 10px', borderRadius: '999px', backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: 600 }}>
                {brokenCount} Broken
              </span>
            )}
          </div>

          <div style={tableCard}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={thStyle}>Unit ID</th>
                  <th style={thStyle}>Item</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {checklist.map(c => (
                  <tr key={c.id} style={{ opacity: savingId === c.id ? 0.6 : 1, transition: 'opacity 0.15s' }}>
                    <td style={tdStyle}>
                      <span style={idBadge}>{fmtUnitId(c.item_id, c.id)}</span>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#111' }}>{c.item_name}</td>
                    <td style={tdStyle}>
                      {/* Borrowed is set by the reservation system — show as read-only badge */}
                      {c.status === 'Borrowed' ? (
                        <span style={{ ...statusBadge, ...statusStyle(c.status) }}>Borrowed</span>
                      ) : (
                        <select
                          value={c.status}
                          disabled={savingId === c.id}
                          onChange={e => handleStatusChange(c, e.target.value)}
                          style={{
                            ...statusBadge,
                            ...statusStyle(c.status),
                            border: 'none',
                            cursor: 'pointer',
                            outline: 'none',
                            appearance: 'none',
                            paddingRight: '20px',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236b7280'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 6px center',
                            backgroundSize: '8px',
                          }}
                        >
                          {STATUSES.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

const thStyle     = { textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontSize: '12px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }
const tdStyle     = { padding: '14px 16px', borderBottom: '1px solid #f3f4f6', fontSize: '14px', color: '#374151' }
const tableCard   = { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden' }
const labelStyle  = { display: 'block', fontSize: '13px', color: '#6b7280', fontWeight: 600, marginBottom: '6px' }
const selectStyle = { width: '100%', padding: '10px 16px', borderRadius: '12px', border: '1.5px solid #e5e7eb', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff', maxWidth: '320px' }
const statusBadge = { fontSize: '12px', padding: '4px 10px', borderRadius: '999px', fontWeight: 600 }
const idBadge     = { fontSize: '12px', color: '#6b7280', fontWeight: 600, fontFamily: 'monospace' }