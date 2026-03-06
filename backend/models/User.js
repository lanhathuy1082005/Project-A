import { pool } from "../db.js";


export const getAdminPasswordHash = async () => {
  const res = await pool.query('SELECT password_hash FROM admins');
  return res.rows[0].password_hash;
}

export const getUserByStudentId = async (student_id) => {
  const res = await pool.query('SELECT * FROM users WHERE student_id = $1', [student_id]);
  return res.rows[0];
}

export const getUserTruthByStudentId = async (student_id) => {
  const res = await pool.query('SELECT * FROM users_truth WHERE student_id = $1', [student_id]);
  return res.rows[0];
}

export const createUser = async (student_id, password_hash) => {
  const res = await pool.query('INSERT INTO users (student_id, password_hash) VALUES ($1, $2) RETURNING *', [student_id, password_hash]);
  return res.rows[0];
}