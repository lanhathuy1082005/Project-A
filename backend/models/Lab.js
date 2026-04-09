import { pool } from '../config/db.js';

export const getAllLabs = async () => {
  const { rows } = await pool.query('SELECT * FROM labs ORDER BY id');
  return rows;
};

export const getLabById = async (id) => {
  const { rows } = await pool.query('SELECT * FROM labs WHERE id = $1', [id]);
  return rows[0] ?? null;
};
