import { pool } from "../db.js";

export const getUserByUserId = async (user_id) => {
  const res = await pool.query('SELECT u.id, u.user_id, u.password_hash, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.user_id = $1', [user_id]);
  return res.rows[0];
}

export const getUserTruthByUserId = async (user_id) => {
  const res = await pool.query('SELECT * FROM users_truth WHERE user_id = $1', [user_id]);
  return res.rows[0];
}

export const createUser = async (user_id, password_hash) => {
  const res = await pool.query(`
    WITH new_user AS (
      INSERT INTO users (user_id, password_hash, role_id)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, password_hash, role_id
    )
    SELECT nu.id, nu.user_id, nu.password_hash, r.name AS role
    FROM new_user nu
    JOIN roles r ON nu.role_id = r.id
  `, [user_id, password_hash, 1]);

  return res.rows[0];
};
