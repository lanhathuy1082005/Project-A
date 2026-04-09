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
  if (error) return (
    <div style={{ padding: '40px 48px' }}>
      <p style={{ color: '#dc2626' }}>{error}</p>
    </div>
  )

  return (
    <div style={{ padding: '40px 48px' }}>
      <h1 style={{ fontWeight: 800, fontSize: '2rem', marginBottom: '6px', color: '#111' }}>
        Dashboard
      </h1>
      <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '32px' }}>
        System overview and today's activity.
      </p>

      {/* Stat cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '40px',
      }}>
        <StatCard label="Active Borrows"     value={data.active_borrows}           onClick={() => navigate('/admin/reservations')} />
        <StatCard label="Pending Returns"    value={data.pending_returns}           onClick={() => navigate('/admin/verification')} />
        <StatCard label="Borrowed Devices"   value={data.borrowed_devices} />
        <StatCard label="Maintenance"        value={data.maintenance_devices} />
        <StatCard label="Available Devices"  value={data.available_devices} />
        <StatCard label="Today's Sessions"   value={data.today_sessions?.length ?? 0} />
      </div>

      {/* Today's sessions table */}
      {data.today_sessions?.length > 0 && (
        <>
          <h2 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111', marginBottom: '14px' }}>
            Today's Sessions
          </h2>
          <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={thStyle}>Course</th>
                  <th style={thStyle}>Start</th>
                  <th style={thStyle}>End</th>
                </tr>
              </thead>
              <tbody>
                {data.today_sessions.map(s => (
                  <tr key={s.id} style={{ transition: 'background-color 0.15s' }}>
                    <td style={tdStyle}>{s.course_name}</td>
                    <td style={tdStyle}>{s.start_time}</td>
                    <td style={tdStyle}>{s.end_time}</td>
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

function StatCard({ label, value, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => onClick && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: '#fff',
        border:          '1px solid #e5e7eb',
        borderRadius:    '16px',
        padding:         '20px 24px',
        boxShadow:       hovered ? '0 4px 16px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.04)',
        cursor:          onClick ? 'pointer' : 'default',
        transform:       hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition:      'box-shadow 0.18s ease, transform 0.18s ease',
      }}
    >
      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#111', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px', fontWeight: 500 }}>{label}</div>
      {onClick && (
        <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '8px', fontWeight: 600 }}>View →</div>
      )}
    </div>
  )
}

const thStyle = {
  textAlign: 'left', padding: '12px 16px',
  borderBottom: '1px solid #e5e7eb',
  fontSize: '12px', color: '#6b7280',
  fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
}
const tdStyle = {
  padding: '14px 16px',
  borderBottom: '1px solid #f3f4f6',
  fontSize: '14px', color: '#374151',
}
