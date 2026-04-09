import { useState, useEffect } from 'react'
import { getLabsApi, getLabChecklistApi } from '../../api/admin.api.js'
import { useToast } from '../../components/Toast.jsx'
import Loading from '../../components/Loading.jsx'

export default function LabChecklist() {
  const addToast = useToast()
  const [labs, setLabs] = useState([])
  const [selectedLab, setSelectedLab] = useState(null)
  const [checklist, setChecklist] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getLabsApi().then(r => setLabs(r.data)).catch(e => addToast(e.message, 'error'))
  }, [])

  const loadChecklist = async (labId) => {
    setSelectedLab(labId)
    setLoading(true)
    try {
      const res = await getLabChecklistApi(labId)
      setChecklist(res.data)
    } catch (e) { addToast(e.message, 'error') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ padding: '40px 48px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontWeight: 800, fontSize: '2rem', marginBottom: '6px', color: '#111', margin: 0 }}>
          Lab Checklist
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '6px', marginBottom: 0 }}>
          View all devices in each lab for maintenance audits.
        </p>
      </div>

      <div style={{ marginBottom: '28px' }}>
        <label style={labelStyle}>Select Lab</label>
        <select value={selectedLab || ''} onChange={e => loadChecklist(parseInt(e.target.value))} style={inputStyle}>
          <option value="">Choose a lab...</option>
          {labs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      {loading && <Loading />}

      {!loading && selectedLab && checklist.length === 0 && (
        <p style={{ color: '#9ca3af', textAlign: 'center', padding: '48px 0' }}>No items found in this lab.</p>
      )}

      {!loading && checklist.length > 0 && (
        <>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>
            Total: {checklist.length} device(s)
          </p>
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
                  <tr key={c.id}>
                    <td style={tdStyle}><span style={idBadge}>#{c.id}</span></td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#111' }}>{c.item_name}</td>
                    <td style={tdStyle}>
                      <span style={{ ...statusBadge, ...statusStyle(c.status) }}>{c.status}</span>
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

const statusStyle = (status) => {
  if (status === 'Available') return { backgroundColor: '#d1fae5', color: '#047857' }
  if (status === 'Borrowed')  return { backgroundColor: '#fef3c7', color: '#b45309' }
  return { backgroundColor: '#fee2e2', color: '#991b1b' }
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
