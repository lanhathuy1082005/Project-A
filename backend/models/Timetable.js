import { pool } from "../db.js";

export const getTimetableIdByStudentId = async (student_id) => {
    const res = await pool.query('SELECT timetable_id FROM timetable_user WHERE student_id = $1', [student_id]);
    return res.rows;
}

export const getTimetableById = async (timetable_id) => {
    const res = await pool.query('SELECT * FROM timetables= WHERE id = $1', [timetable_id]);
    return res.rows[0];
}