import { pool } from '../config/db.js';

export const getUserReservations = async (user_id, { limit, offset }) => {
  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT * FROM v_reservations
       WHERE user_id = $1
       AND actual_return_date IS NULL
       ORDER BY borrow_date DESC
       LIMIT $2 OFFSET $3`,
      [user_id, limit, offset]
    ),
    pool.query(
      `SELECT COUNT(*) FROM v_reservations WHERE user_id = $1 AND actual_return_date IS NULL`,
      [user_id]
    ),
  ]);
  return { data: rows.rows, total: parseInt(count.rows[0].count) };
};

export const getAllReservations = async ({ limit, offset, status, userId, classId, dateFrom, dateTo }) => {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (status === 'not_returned') {
    conditions.push('actual_return_date IS NULL');
  } else if (status === 'overdue') {
    conditions.push("actual_return_date IS NULL AND DATE(borrow_date) < CURRENT_DATE");
  } else if (status === 'returned') {
    conditions.push('actual_return_date IS NOT NULL');
  }

  if (userId) {
    conditions.push(`user_id = $${idx++}`);
    params.push(userId);
  }

  if (classId) {
    conditions.push(`id IN (SELECT r2.id FROM reservations r2 WHERE r2.timetable_id = $${idx++})`);
    params.push(classId);
  }

  if (dateFrom) {
    conditions.push(`borrow_date >= $${idx++}`);
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push(`borrow_date <= $${idx++}`);
    params.push(dateTo);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT * FROM v_reservations
       ${where}
       ORDER BY borrow_date DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    ),
    pool.query(
      `SELECT COUNT(*) FROM v_reservations ${where}`,
      params
    ),
  ]);
  return { data: rows.rows, total: parseInt(count.rows[0].count) };
};

export const getReservationById = async (id) => {
  const { rows } = await pool.query(
    `SELECT * FROM v_reservations WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
};

export const createReservation = async (item_unit_id, user_id, timetable_id, client) => {
  const { rows } = await client.query(
    `INSERT INTO reservations (item_unit_id, user_id, timetable_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (item_unit_id) WHERE actual_return_date IS NULL DO NOTHING
     RETURNING *`,
    [item_unit_id, user_id, timetable_id]
  );
  return rows[0] ?? null;
};

export const markReturned = async (reservation_id) => {
  const { rows } = await pool.query(
    `UPDATE reservations
     SET actual_return_date = NOW()
     WHERE id = $1
       AND actual_return_date IS NULL
     RETURNING *`,
    [reservation_id]
  );
  return rows[0] ?? null;
};

export const markApproved = async (reservation_id) => {
  const { rows } = await pool.query(
    `UPDATE reservations
     SET approved = TRUE
     WHERE id = $1 AND approved IS NULL
     RETURNING *`,
    [reservation_id]
  );
  return rows[0] ?? null;
};

export const markMaintenance = async (reservation_id) => {
  const { rows } = await pool.query(
    `UPDATE reservations
     SET approved = FALSE
     WHERE id = $1 AND approved IS NULL
     RETURNING *`,
    [reservation_id]
  );
  return rows[0] ?? null;
};

// Pending returns (return submitted but not yet verified)
export const getPendingReturns = async ({ limit, offset }) => {
  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT * FROM v_reservations
       WHERE actual_return_date IS NOT NULL AND approved IS NULL
       ORDER BY actual_return_date ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
    pool.query(
      `SELECT COUNT(*) FROM v_reservations
       WHERE actual_return_date IS NOT NULL AND approved IS NULL`
    ),
  ]);
  return { data: rows.rows, total: parseInt(count.rows[0].count) };
};

// Logs - all reservations with full history (including returned)
export const getReservationLogs = async ({ limit, offset, userId, classId, dateFrom, dateTo }) => {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (userId) {
    conditions.push(`user_id = $${idx++}`);
    params.push(userId);
  }
  if (classId) {
    conditions.push(`id IN (SELECT r2.id FROM reservations r2 WHERE r2.timetable_id = $${idx++})`);
    params.push(classId);
  }
  if (dateFrom) {
    conditions.push(`borrow_date >= $${idx++}`);
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push(`borrow_date <= $${idx++}`);
    params.push(dateTo);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT * FROM v_reservations
       ${where}
       ORDER BY borrow_date DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    ),
    pool.query(
      `SELECT COUNT(*) FROM v_reservations ${where}`,
      params
    ),
  ]);
  return { data: rows.rows, total: parseInt(count.rows[0].count) };
};

// Dashboard stats
export const getDashboardStats = async () => {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE actual_return_date IS NULL) AS active_borrows,
       COUNT(*) FILTER (WHERE actual_return_date IS NOT NULL AND approved IS NULL) AS pending_returns
     FROM reservations`
  );
  return rows[0];
};