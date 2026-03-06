import { pool } from "../db.js";

export const getCourseNameById = async (course_id) => {
    const res = await pool.query('SELECT name FROM courses WHERE id = $1', [course_id]);
    return res.rows[0];
}