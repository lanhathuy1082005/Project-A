import { pool } from '../config/db.js';

export const createFeedback = async (userId, content) => {
  const { rows } = await pool.query(
    `INSERT INTO feedback (user_id, content)
     VALUES ($1, $2)
     RETURNING *`,
    [userId, content]
  );
  return rows[0];
};

export const getAllFeedback = async ({ limit, offset }) => {
  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT f.*, u.id AS user_id
       FROM feedback f
       JOIN users u ON u.id = f.user_id
       ORDER BY f.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
    pool.query('SELECT COUNT(*) FROM feedback'),
  ]);
  return { data: rows.rows, total: parseInt(count.rows[0].count) };
};
