import { pool } from '../config/db.js';

export const getAllCourses = async () => {
  const { rows } = await pool.query('SELECT * FROM courses ORDER BY id');
  return rows;
};
