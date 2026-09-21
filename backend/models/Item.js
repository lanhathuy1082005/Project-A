import { db } from '../utils/dbClient.js';

export const getAllItems = async () => {
  const { data } = await db.get('/items');
  return data;
};

export const addItem = async (name) => {
  return db.post('/items', { name });
};

export const updateItem = async (id, name) => {
  return db.put(`/items/${id}`, { name });
};

export const deleteItem = async (id) => {
  return db.delete(`/items/${id}`);
};

// ── Item Units ──────────────────────────────────────────────────────────────

export const getAllItemUnits = async ({ limit, offset, status }) => {
  return db.get('/item-units', { limit, offset, status });
};

export const addItemUnit = async (itemId, labId) => {
  return db.post('/item-units', { item_id: itemId, lab_id: labId });
};

export const updateItemUnit = async (id, labId, status) => {
  return db.put(`/item-units/${id}`, { lab_id: labId, status });
};

export const deleteItemUnit = async (id) => {
  return db.delete(`/item-units/${id}`);
};

// ── Dashboard stats ─────────────────────────────────────────────────────────

export const getInventoryStats = async () => {
  return db.get('/inventory/stats');
};

// ── Checklist: all item_units in a lab ───────────────────────────────────────
export const getLabChecklist = async (labId) => {
  const { data } = await db.get(`/labs/${labId}/checklist`);
  return data;
};
