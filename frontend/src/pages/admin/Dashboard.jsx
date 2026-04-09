import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboardApi } from '../../api/admin.api.js'
import Loading from '../../components/Loading.jsx'

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getDashboardApi()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading />
  if (error) return <p style={{ padding: '24px', color: 'var(--color-text-danger)' }}>{error}</p>

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <h2 style={{ fontWeight: 500, marginBottom: '20px' }}>Dashboard</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <StatCard label="Active Borrows" value={data.active_borrows} onClick={() => navigate('/admin/reservations')} />
        <StatCard label="Pending Returns" value={data.pending_returns} onClick={() => navigate('/admin/verification')} />
        <StatCard label="Borrowed Devices" value={data.borrowed_devices} />
        <StatCard label="Maintenance" value={data.maintenance_devices} />
        <StatCard label="Available Devices" value={data.available_devices} />
        <StatCard label="Today's Sessions" value={data.today_sessions?.length ?? 0} />
      </div>

      {data.today_sessions?.length > 0 && (
        <>
          <h3 style={{ fontWeight: 500, marginBottom: '8px' }}>Today's Sessions</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Course</th>
                <th style={thStyle}>Start</th>
                <th style={thStyle}>End</th>
              </tr>
            </thead>
            <tbody>
              {data.today_sessions.map(s => (
                <tr key={s.id}>
                  <td style={tdStyle}>{s.course_name}</td>
                  <td style={tdStyle}>{s.start_time}</td>
                  <td style={tdStyle}>{s.end_time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: '12px', padding: '16px',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ fontSize: '24px', fontWeight: 600 }}>{value}</div>
      <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>{label}</div>
    </div>
  )
}

const thStyle = { textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--color-border-tertiary)', fontSize: '13px', color: 'var(--color-text-secondary)' }
const tdStyle = { padding: '8px 12px', borderBottom: '1px solid var(--color-border-tertiary)', fontSize: '14px' }
