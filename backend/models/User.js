import { pool } from '../config/db.js';

export const getUserByUserId = async (id) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.password_hash, r.name AS role
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.id = $1`,
    [id]
  );
  return rows[0] ?? null;
};

export const createUser = async (id, password_hash) => {
  const { rows } = await pool.query(
    `WITH new_user AS (
       INSERT INTO users (id, password_hash, role_id)
       VALUES ($1, $2, 1) 
       RETURNING id, role_id
     )
     SELECT nu.id, r.name AS role
     FROM new_user nu
     JOIN roles r ON r.id = nu.role_id`,
    [id, password_hash]
  );
  return rows[0];
};

export const updateFacePath = async (id, path) => {
  await pool.query('UPDATE users SET face_image_path = $1 WHERE id = $2', [path, id])
}