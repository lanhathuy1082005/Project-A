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
  }, [page])

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
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontWeight: 500, margin: 0 }}>Class Management</h2>
        <button onClick={openCreate}>+ Add Class</button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
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
              <td style={tdStyle}>{c.id}</td>
              <td style={tdStyle}>{c.course_name}</td>
              <td style={tdStyle}>{DAYS[c.day_of_week]}</td>
              <td style={tdStyle}>{c.start_time}</td>
              <td style={tdStyle}>{c.end_time}</td>
              <td style={tdStyle}>
                <button onClick={() => viewStudents(c)} style={{ marginRight: '4px' }}>Students</button>
                <button onClick={() => openEdit(c)} style={{ marginRight: '4px' }}>Edit</button>
                <button onClick={() => handleDelete(c.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />

      {/* Students modal */}
      {selectedClass && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ margin: '0 0 12px' }}>Students in {selectedClass.course_name} (ID: {selectedClass.id})</h3>
            {students.length === 0 ? <p>No students enrolled.</p> : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={thStyle}>User ID</th><th style={thStyle}>Joined</th></tr></thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.user_id}>
                      <td style={tdStyle}>{s.user_id}</td>
                      <td style={tdStyle}>{new Date(s.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button onClick={() => setSelectedClass(null)} style={{ marginTop: '12px' }}>Close</button>
          </div>
        </div>
      )}

      {/* Create/Edit form modal */}
      {showForm && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ margin: '0 0 12px' }}>{editId ? 'Edit Class' : 'Create Class'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={labelStyle}>Course</label>
              <select value={form.course_id} onChange={e => setForm(p => ({ ...p, course_id: parseInt(e.target.value) }))}>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <label style={labelStyle}>Day of Week</label>
              <select value={form.day_of_week} onChange={e => setForm(p => ({ ...p, day_of_week: parseInt(e.target.value) }))}>
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
              <label style={labelStyle}>Start Time</label>
              <input type="time" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} />
              <label style={labelStyle}>End Time</label>
              <input type="time" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setShowForm(false)}>Cancel</button>
              <button onClick={handleSubmit}>{editId ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const thStyle = { textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--color-border-tertiary)', fontSize: '13px', color: 'var(--color-text-secondary)' }
const tdStyle = { padding: '8px 12px', borderBottom: '1px solid var(--color-border-tertiary)', fontSize: '14px' }
const labelStyle = { fontSize: '13px', color: 'var(--color-text-secondary)' }
const overlayStyle = { position: 'fixed', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.4)', zIndex: 1000, padding: '16px' }
const modalStyle = { maxWidth: '500px', width: '100%', background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: '12px', padding: '24px', maxHeight: '80vh', overflow: 'auto' }
