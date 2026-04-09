import { pool } from '../config/db.js';

export const getAllItems = async () => {
  const { rows } = await pool.query('SELECT * FROM items ORDER BY id');
  return rows;
};

export const addItem = async (name) => {
  const { rows } = await pool.query(
    `INSERT INTO items (name) VALUES ($1) RETURNING *`,
    [name]
  );
  return rows[0];
};

export const updateItem = async (id, name) => {
  const { rows } = await pool.query(
    `UPDATE items SET name = $1 WHERE id = $2 RETURNING *`,
    [name, id]
  );
  return rows[0] ?? null;
};

export const deleteItem = async (id) => {
  const { rows } = await pool.query(
    `DELETE FROM items WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0] ?? null;
};

// ── Item Units ──────────────────────────────────────────────────────────────

export const getAllItemUnits = async ({ limit, offset, status }) => {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (status) {
    conditions.push(`iu.status = $${idx++}`);
    params.push(status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT iu.id, iu.status,
              i.id AS item_id, i.name AS item_name,
              l.id AS lab_id, l.name AS lab_name
       FROM item_units iu
       JOIN items i ON i.id = iu.item_id
       LEFT JOIN labs l ON l.id = iu.lab_id
       ${where}
       ORDER BY iu.id
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    ),
    pool.query(
      `SELECT COUNT(*) FROM item_units iu ${where}`,
      params
    ),
  ]);
  return { data: rows.rows, total: parseInt(count.rows[0].count) };
};

export const addItemUnit = async (itemId, labId) => {
  const { rows } = await pool.query(
    `INSERT INTO item_units (item_id, lab_id)
     VALUES ($1, $2)
     RETURNING *`,
    [itemId, labId]
  );
  return rows[0];
};

export const updateItemUnit = async (id, labId, status) => {
  const { rows } = await pool.query(
    `UPDATE item_units
     SET lab_id = COALESCE($1, lab_id),
         status = COALESCE($2, status)
     WHERE id = $3
     RETURNING *`,
    [labId, status, id]
  );
  return rows[0] ?? null;
};

export const deleteItemUnit = async (id) => {
  const { rows } = await pool.query(
    `DELETE FROM item_units WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0] ?? null;
};

// ── Dashboard stats ─────────────────────────────────────────────────────────

export const getInventoryStats = async () => {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'Borrowed') AS borrowed_count,
       COUNT(*) FILTER (WHERE status = 'Maintenance') AS maintenance_count,
       COUNT(*) FILTER (WHERE status = 'Available') AS available_count
     FROM item_units`
  );
  return rows[0];
};

// ── Checklist: all item_units in a lab ───────────────────────────────────────
export const getLabChecklist = async (labId) => {
  const { rows } = await pool.query(
    `SELECT iu.id, iu.status,
            i.name AS item_name
     FROM item_units iu
     JOIN items i ON i.id = iu.item_id
     WHERE iu.lab_id = $1
     ORDER BY i.name`,
    [labId]
  );
  return rows;
};

