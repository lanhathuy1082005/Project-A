import { pool } from "../db.js";

//student
export const getUserReservationsByStudentId = async (student_id) => {
    const res = await pool.query('SELECT * FROM reservations WHERE user_id = $1 ORDER BY borrow_date DESC', [student_id]);
    return res.rows;
}

//admin
export const getAllReservations = async () => {
    const res = await pool.query('SELECT * FROM reservations ORDER BY timestamp DESC');
    return res.rows;
}

//student reserves an item unit for a specific timetable
export const createReservation = async (item_unit_id,user_id,timetable_id) => {
    const res = await pool.query('INSERT INTO reservations (item_unit_id, user_id, timetable_id) VALUES ($1, $2, $3) RETURNING *', [item_unit_id, user_id, timetable_id]);
    return res.rows[0];
}

export const updateReservation = async (reservation_id, actual_return_date) => {
    const res = await pool.query(
        `UPDATE reservations SET actual_return_date = $1 WHERE id = $2 RETURNING *`,
        [actual_return_date, reservation_id]
        );
    return res.rows[0];
}
