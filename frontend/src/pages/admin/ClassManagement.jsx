import { useState, useEffect, useCallback } from 'react'
import { getClassesApi, getClassStudentsApi, createClassApi, updateClassApi, deleteClassApi, getCoursesApi } from '../../api/admin.api.js'
import { useToast } from '../../components/Toast.jsx'
import Pagination from '../../components/Pagination.jsx'
import Loading from '../../components/Loading.jsx'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function ClassManagement() {
  const addToast = useToast()
  const [classes, setClasses] = useState([])
  const [courses, setCourses] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState(null)
  const [students, setStudents] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ course_id: '', day_of_week: 1, start_time: '', end_time: '' })
  const LIMIT = 20

  const fetchClasses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getClassesApi(page, LIMIT)
      setClasses(res.data)
      setTotal(res.total)
    } catch (e) { addToast(e.message, 'error') }
    finally { setLoading(false) }
  }, [page, addToast])

  useEffect(() => { fetchClasses() }, [fetchClasses])

  useEffect(() => {
    getCoursesApi().then(r => setCourses(r.data)).catch(() => {})
  }, [])

  const viewStudents = async (cls) => {
    setSelectedClass(cls)
    try {
      const res = await getClassStudentsApi(cls.id)
      setStudents(res.data)
    } catch (e) { addToast(e.message, 'error') }
  }

  const openCreate = () => {
    setEditId(null)
    setForm({ course_id: courses[0]?.id || '', day_of_week: 1, start_time: '', end_time: '' })
    setShowForm(true)
  }

  const openEdit = (cls) => {
    setEditId(cls.id)
    setForm({ course_id: cls.course_id, day_of_week: cls.day_of_week, start_time: cls.start_time, end_time: cls.end_time })
    setShowForm(true)
  }

  const handleSubmit = async () => {
    try {
      if (editId) {
        await updateClassApi(editId, form)
        addToast('Class updated', 'success')
      } else {
        await createClassApi(form)
        addToast('Class created', 'success')
      }
      setShowForm(false)
      fetchClasses()
    } catch (e) { addToast(e.message, 'error') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this class?')) return
    try {
      await deleteClassApi(id)
      addToast('Class deleted', 'success')
      fetchClasses()
    } catch (e) { addToast(e.message, 'error') }
  }

  if (loading) return <Loading />

  return (
    <div style={{ padding: '40px 48px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: '2rem', marginBottom: '6px', color: '#111', margin: 0 }}>
            Class Management
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '6px', marginBottom: 0 }}>
            Manage timetable classes and enrolled students.
          </p>
        </div>
        <button onClick={openCreate} style={primaryBtn}>+ Add Class</button>
      </div>

      <div style={tableCard}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Course</th>
              <th style={thStyle}>Day</th>
              <th style={thStyle}>Start</th>
              <th style={thStyle}>End</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {classes.map(c => (
              <tr key={c.id}>
                <td style={tdStyle}><span style={idBadge}>#{c.id}</span></td>
                <td style={{ ...tdStyle, fontWeight: 600, color: '#111' }}>{c.course_name}</td>
                <td style={tdStyle}>{DAYS[c.day_of_week]}</td>
                <td style={tdStyle}>{c.start_time}</td>
                <td style={tdStyle}>{c.end_time}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => viewStudents(c)} style={outlineBtn}>Students</button>
                    <button onClick={() => openEdit(c)} style={outlineBtn}>Edit</button>
                    <button onClick={() => handleDelete(c.id)} style={dangerBtn}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />

      {/* Students modal */}
      {selectedClass && (
        <div style={overlayStyle} onClick={() => setSelectedClass(null)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h3 style={modalTitle}>Students in {selectedClass.course_name}</h3>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
              Class ID: #{selectedClass.id}
            </p>
            {students.length === 0 ? (
              <p style={{ color: '#9ca3af', textAlign: 'center', padding: '24px 0' }}>No students enrolled.</p>
            ) : (
              <div style={tableCard}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb' }}>
                      <th style={thStyle}>User ID</th>
                      <th style={thStyle}>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s => (
                      <tr key={s.user_id}>
                        <td style={tdStyle}>{s.user_id}</td>
                        <td style={tdStyle}>{new Date(s.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedClass(null)} style={outlineBtn}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit form modal */}
      {showForm && (
        <div style={overlayStyle} onClick={() => setShowForm(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h3 style={modalTitle}>{editId ? 'Edit Class' : 'Create Class'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Course</label>
                <select value={form.course_id} onChange={e => setForm(p => ({ ...p, course_id: parseInt(e.target.value) }))} style={inputStyle}>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Day of Week</label>
                <select value={form.day_of_week} onChange={e => setForm(p => ({ ...p, day_of_week: parseInt(e.target.value) }))} style={inputStyle}>
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Start Time</label>
                <input type="time" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>End Time</label>
                <input type="time" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button onClick={() => setShowForm(false)} style={outlineBtn}>Cancel</button>
              <button onClick={handleSubmit} style={primaryBtn}>{editId ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const primaryBtn = {
  padding: '10px 22px', borderRadius: '999px',
  backgroundColor: '#dc2626', color: '#fff',
  border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
  whiteSpace: 'nowrap',
}
const outlineBtn = {
  padding: '8px 16px', borderRadius: '999px',
  backgroundColor: 'transparent', color: '#374151',
  border: '1.5px solid #e5e7eb', fontWeight: 600,
  fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap',
}
const dangerBtn = {
  padding: '8px 16px', borderRadius: '999px',
  backgroundColor: 'transparent', color: '#dc2626',
  border: '1.5px solid #fca5a5', fontWeight: 600,
  fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap',
}
const thStyle = {
  textAlign: 'left', padding: '12px 16px',
  borderBottom: '1px solid #e5e7eb',
  fontSize: '12px', color: '#6b7280',
  fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
}
const tdStyle = {
  padding: '14px 16px',
  borderBottom: '1px solid #f3f4f6',
  fontSize: '14px', color: '#374151',
}
const tableCard = {
  backgroundColor: '#fff', border: '1px solid #e5e7eb',
  borderRadius: '16px', overflow: 'hidden',
}
const overlayStyle = {
  position: 'fixed', inset: 0,
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  background: 'rgba(0,0,0,0.65)', zIndex: 1000, padding: '24px',
}
const modalStyle = {
  maxWidth: '480px', width: '100%',
  backgroundColor: '#fff', borderRadius: '20px',
  padding: '32px',
  boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
  maxHeight: '80vh', overflowY: 'auto',
}
const modalTitle = { fontWeight: 800, fontSize: '1.3rem', color: '#111', margin: '0 0 8px' }
const labelStyle = { display: 'block', fontSize: '13px', color: '#6b7280', fontWeight: 600, marginBottom: '6px' }
const inputStyle = {
  width: '100%', padding: '10px 16px',
  borderRadius: '12px', border: '1.5px solid #e5e7eb',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  backgroundColor: '#fff',
}
const idBadge = {
  fontSize: '12px', color: '#6b7280', fontWeight: 600,
}
