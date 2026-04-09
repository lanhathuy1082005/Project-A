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

export default function Inventory() {
  const addToast = useToast()

  // Items (types)
  const [items, setItems] = useState([])
  const [labs, setLabs] = useState([])
  const [showItemForm, setShowItemForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [itemName, setItemName] = useState('')

  // Item Units
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

  // ── Item type CRUD ────────────────────────────────────────────────────────
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

  // ── Item Unit CRUD ────────────────────────────────────────────────────────
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
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Item Types section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontWeight: 500, margin: 0 }}>Item Types</h2>
        <button onClick={() => { setEditItem(null); setItemName(''); setShowItemForm(true) }}>+ Add Item Type</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '32px' }}>
        <thead>
          <tr><th style={thStyle}>ID</th><th style={thStyle}>Name</th><th style={thStyle}>Actions</th></tr>
        </thead>
        <tbody>
          {items.map(i => (
            <tr key={i.id}>
              <td style={tdStyle}>{i.id}</td>
              <td style={tdStyle}>{i.name}</td>
              <td style={tdStyle}>
                <button onClick={() => { setEditItem(i); setItemName(i.name); setShowItemForm(true) }} style={{ marginRight: '4px' }}>Edit</button>
                <button onClick={() => handleDeleteItem(i.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Item Units section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontWeight: 500, margin: 0 }}>Item Units (Devices)</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={openCreateUnit}>+ Add Unit</button>
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>ID</th><th style={thStyle}>Item</th>
            <th style={thStyle}>Lab</th>
            <th style={thStyle}>Status</th><th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {units.map(u => (
            <tr key={u.id}>
              <td style={tdStyle}>{u.id}</td>
              <td style={tdStyle}>{u.item_name}</td>
              <td style={tdStyle}>{u.lab_name || '—'}</td>
              <td style={tdStyle}>
                <span style={{
                  fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: 500,
                  background: u.status === 'Available' ? 'var(--color-background-success)' :
                              u.status === 'Borrowed' ? 'var(--color-background-warning)' :
                              'var(--color-background-danger)',
                  color: u.status === 'Available' ? 'var(--color-text-success)' :
                         u.status === 'Borrowed' ? 'var(--color-text-warning)' :
                         'var(--color-text-danger)',
                }}>
                  {u.status}
                </span>
              </td>
              <td style={tdStyle}>
                <button onClick={() => openEditUnit(u)} style={{ marginRight: '4px' }}>Edit</button>
                <button onClick={() => handleDeleteUnit(u.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />

      {/* Item type form modal */}
      {showItemForm && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ margin: '0 0 12px' }}>{editItem ? 'Edit Item Type' : 'Add Item Type'}</h3>
            <input value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Item name" style={{ width: '100%', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button onClick={() => setShowItemForm(false)}>Cancel</button>
              <button onClick={handleSaveItem}>{editItem ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Item unit form modal */}
      {showUnitForm && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ margin: '0 0 12px' }}>{editUnit ? 'Edit Item Unit' : 'Add Item Unit'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={labelStyle}>Item Type</label>
              <select value={unitForm.item_id} onChange={e => setUnitForm(p => ({ ...p, item_id: parseInt(e.target.value) }))}>
                {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>

              <label style={labelStyle}>Lab</label>
              <select value={unitForm.lab_id} onChange={e => setUnitForm(p => ({ ...p, lab_id: parseInt(e.target.value) || '' }))}>
                <option value="">None</option>
                {labs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              {editUnit && (
                <>
                  <label style={labelStyle}>Status</label>
                  <select value={unitForm.status} onChange={e => setUnitForm(p => ({ ...p, status: e.target.value }))}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setShowUnitForm(false)}>Cancel</button>
              <button onClick={handleSaveUnit}>{editUnit ? 'Update' : 'Create'}</button>
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
const modalStyle = { maxWidth: '500px', width: '100%', background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: '12px', padding: '24px' }
