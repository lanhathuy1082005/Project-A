import { useState, useEffect, useCallback } from 'react'
import {
  getItemsApi, addItemApi, updateItemApi, deleteItemApi,
  getItemUnitsApi, addItemUnitApi, updateItemUnitApi, deleteItemUnitApi,
  getLabsApi,
} from '../../api/admin.api.js'
import { useToast } from '../../components/Toast.jsx'
import Pagination from '../../components/Pagination.jsx'
import Loading from '../../components/Loading.jsx'

const STATUSES = ['Available', 'Borrowed', 'Maintenance']

const statusStyle = (status) => {
  if (status === 'Available') return { backgroundColor: '#dcfce7', color: '#16a34a' }
  if (status === 'Borrowed')  return { backgroundColor: '#fef9c3', color: '#a16207' }
  return { backgroundColor: 'rgba(220,38,38,0.1)', color: '#dc2626' }
}

export default function Inventory() {
  const addToast = useToast()

  const [items, setItems] = useState([])
  const [labs, setLabs] = useState([])
  const [showItemForm, setShowItemForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [itemName, setItemName] = useState('')

  const [units, setUnits] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showUnitForm, setShowUnitForm] = useState(false)
  const [editUnit, setEditUnit] = useState(null)
  const [unitForm, setUnitForm] = useState({ item_id: '', lab_id: '', status: 'Available' })
  const LIMIT = 20

  useEffect(() => {
    getItemsApi().then(r => setItems(r.data)).catch(() => {})
    getLabsApi().then(r => setLabs(r.data)).catch(() => {})
  }, [])

  const fetchUnits = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getItemUnitsApi(page, LIMIT, statusFilter || undefined)
      setUnits(res.data)
      setTotal(res.total)
    } catch (e) { addToast(e.message, 'error') }
    finally { setLoading(false) }
  }, [page, statusFilter])

  useEffect(() => { fetchUnits() }, [fetchUnits])

  const handleSaveItem = async () => {
    try {
      if (editItem) {
        await updateItemApi(editItem.id, { name: itemName })
        addToast('Item updated', 'success')
      } else {
        await addItemApi({ name: itemName })
        addToast('Item created', 'success')
      }
      setShowItemForm(false)
      const r = await getItemsApi()
      setItems(r.data)
    } catch (e) { addToast(e.message, 'error') }
  }

  const handleDeleteItem = async (id) => {
    if (!confirm('Delete this item type?')) return
    try {
      await deleteItemApi(id)
      addToast('Item deleted', 'success')
      const r = await getItemsApi()
      setItems(r.data)
    } catch (e) { addToast(e.message, 'error') }
  }

  const openCreateUnit = () => {
    setEditUnit(null)
    setUnitForm({ item_id: items[0]?.id || '', lab_id: labs[0]?.id || '', status: 'Available' })
    setShowUnitForm(true)
  }

  const openEditUnit = (u) => {
    setEditUnit(u)
    setUnitForm({ item_id: u.item_id, lab_id: u.lab_id || '', status: u.status })
    setShowUnitForm(true)
  }

  const handleSaveUnit = async () => {
    try {
      if (editUnit) {
        await updateItemUnitApi(editUnit.id, unitForm)
        addToast('Item unit updated', 'success')
      } else {
        await addItemUnitApi(unitForm)
        addToast('Item unit created', 'success')
      }
      setShowUnitForm(false)
      fetchUnits()
    } catch (e) { addToast(e.message, 'error') }
  }

  const handleDeleteUnit = async (id) => {
    if (!confirm('Delete this item unit?')) return
    try {
      await deleteItemUnitApi(id)
      addToast('Item unit deleted', 'success')
      fetchUnits()
    } catch (e) { addToast(e.message, 'error') }
  }

  if (loading && units.length === 0) return <Loading />

  return (
    <div style={{ padding: '40px 48px' }}>
      <h1 style={{ fontWeight: 800, fontSize: '2rem', marginBottom: '6px', color: '#111' }}>
        Inventory
      </h1>
      <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '36px' }}>
        Manage item types and individual device units.
      </p>

      {/* ── Item Types ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111', margin: 0 }}>Item Types</h2>
        <button onClick={() => { setEditItem(null); setItemName(''); setShowItemForm(true) }} style={primaryBtn}>
          + Add Item Type
        </button>
      </div>
      <div style={{ ...tableCard, marginBottom: '40px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(i => (
              <tr key={i.id}>
                <td style={tdStyle}><span style={idBadge}>#{i.id}</span></td>
                <td style={{ ...tdStyle, fontWeight: 600, color: '#111' }}>{i.name}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => { setEditItem(i); setItemName(i.name); setShowItemForm(true) }} style={outlineBtn}>Edit</button>
                    <button onClick={() => handleDeleteItem(i.id)} style={dangerBtn}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Item Units ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111', margin: 0 }}>Item Units (Devices)</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} style={filterSelect}>
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={openCreateUnit} style={primaryBtn}>+ Add Unit</button>
        </div>
      </div>
      <div style={tableCard}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Item</th>
              <th style={thStyle}>Lab</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {units.map(u => (
              <tr key={u.id}>
                <td style={tdStyle}><span style={idBadge}>#{u.id}</span></td>
                <td style={{ ...tdStyle, fontWeight: 600, color: '#111' }}>{u.item_name}</td>
                <td style={tdStyle}>{u.lab_name || '—'}</td>
                <td style={tdStyle}>
                  <span style={{ ...statusBadge, ...statusStyle(u.status) }}>{u.status}</span>
                </td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => openEditUnit(u)} style={outlineBtn}>Edit</button>
                    <button onClick={() => handleDeleteUnit(u.id)} style={dangerBtn}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />

      {/* Item type form modal */}
      {showItemForm && (
        <div style={overlayStyle} onClick={() => setShowItemForm(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h3 style={modalTitle}>{editItem ? 'Edit Item Type' : 'Add Item Type'}</h3>
            <div>
              <label style={labelStyle}>Item Name</label>
              <input
                value={itemName}
                onChange={e => setItemName(e.target.value)}
                placeholder="e.g. Oscilloscope"
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button onClick={() => setShowItemForm(false)} style={outlineBtn}>Cancel</button>
              <button onClick={handleSaveItem} style={primaryBtn}>{editItem ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Item unit form modal */}
      {showUnitForm && (
        <div style={overlayStyle} onClick={() => setShowUnitForm(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h3 style={modalTitle}>{editUnit ? 'Edit Item Unit' : 'Add Item Unit'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Item Type</label>
                <select value={unitForm.item_id} onChange={e => setUnitForm(p => ({ ...p, item_id: parseInt(e.target.value) }))} style={inputStyle}>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Lab</label>
                <select value={unitForm.lab_id} onChange={e => setUnitForm(p => ({ ...p, lab_id: parseInt(e.target.value) || '' }))} style={inputStyle}>
                  <option value="">None</option>
                  {labs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              {editUnit && (
                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={unitForm.status} onChange={e => setUnitForm(p => ({ ...p, status: e.target.value }))} style={inputStyle}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button onClick={() => setShowUnitForm(false)} style={outlineBtn}>Cancel</button>
              <button onClick={handleSaveUnit} style={primaryBtn}>{editUnit ? 'Update' : 'Create'}</button>
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
  border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap',
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
  padding: '14px 16px', borderBottom: '1px solid #f3f4f6',
  fontSize: '14px', color: '#374151',
}
const tableCard = { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden' }
const overlayStyle = { position: 'fixed', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.65)', zIndex: 1000, padding: '24px' }
const modalStyle = { maxWidth: '480px', width: '100%', backgroundColor: '#fff', borderRadius: '20px', padding: '32px', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', maxHeight: '80vh', overflowY: 'auto' }
const modalTitle = { fontWeight: 800, fontSize: '1.3rem', color: '#111', margin: '0 0 20px' }
const labelStyle = { display: 'block', fontSize: '13px', color: '#6b7280', fontWeight: 600, marginBottom: '6px' }
const inputStyle = { width: '100%', padding: '10px 16px', borderRadius: '12px', border: '1.5px solid #e5e7eb', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff' }
const filterSelect = { padding: '8px 16px', borderRadius: '999px', border: '1.5px solid #e5e7eb', fontSize: '14px', outline: 'none', backgroundColor: '#fff', cursor: 'pointer' }
const statusBadge = { fontSize: '12px', padding: '4px 10px', borderRadius: '999px', fontWeight: 600 }
const idBadge = { fontSize: '12px', color: '#6b7280', fontWeight: 600 }
