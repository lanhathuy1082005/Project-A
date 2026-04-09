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
      'SELECT COUNT(*) FROM v_reservations WHERE user_id = $1',
      [user_id]
    ),
  ]);
  return { data: rows.rows, total: parseInt(count.rows[0].count) };
};

export const getAllReservations = async ({ limit, offset }) => {
  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT * FROM v_reservations
       ORDER BY borrow_date DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
    pool.query('SELECT COUNT(*) FROM v_reservations'),
  ]);
  return { data: rows.rows, total: parseInt(count.rows[0].count) };
};

export const createReservation = async (item_unit_id, user_id, timetable_id, client) => {
  const { rows } = await client.query(
    `INSERT INTO reservations (item_unit_id, user_id, timetable_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (item_unit_id) WHERE actual_return_date IS NULL DO NOTHING
     RETURNING *`,
    [item_unit_id, user_id, timetable_id]
  );
  return rows[0] ?? null;   // null = item đã bị borrow bởi người khác
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
  return rows[0] ?? null;   // null = đã trả rồi hoặc id sai
};

export const markApproved = async (reservation_id) => {
  const { rows } = await pool.query(
    `UPDATE reservations
     SET approved = TRUE
     WHERE id = $1 AND approved = NULL
      RETURNING *`, [reservation_id]
    );
  return rows[0] ?? null;  
}