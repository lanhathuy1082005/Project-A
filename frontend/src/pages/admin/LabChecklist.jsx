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
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <h2 style={{ fontWeight: 500, marginBottom: '16px' }}>Lab Checklist</h2>
      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
        Select a lab to view all devices for periodic maintenance or audit checks.
      </p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <select value={selectedLab || ''} onChange={e => loadChecklist(parseInt(e.target.value))}>
          <option value="">Select a lab...</option>
          {labs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      {loading && <Loading />}

      {!loading && selectedLab && checklist.length === 0 && (
        <p style={{ color: 'var(--color-text-tertiary)' }}>No items found in this lab.</p>
      )}

      {!loading && checklist.length > 0 && (
        <>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
            Total: {checklist.length} device(s)
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Unit ID</th>
                <th style={thStyle}>Item</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {checklist.map(c => (
                <tr key={c.id}>
                  <td style={tdStyle}>{c.id}</td>
                  <td style={tdStyle}>{c.item_name}</td>
                  <td style={tdStyle}>
                    <span style={{
                      fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: 500,
                      background: c.status === 'Available' ? 'var(--color-background-success)' :
                                  c.status === 'Borrowed' ? 'var(--color-background-warning)' :
                                  'var(--color-background-danger)',
                      color: c.status === 'Available' ? 'var(--color-text-success)' :
                             c.status === 'Borrowed' ? 'var(--color-text-warning)' :
                             'var(--color-text-danger)',
                    }}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

const thStyle = { textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--color-border-tertiary)', fontSize: '13px', color: 'var(--color-text-secondary)' }
const tdStyle = { padding: '8px 12px', borderBottom: '1px solid var(--color-border-tertiary)', fontSize: '14px' }
