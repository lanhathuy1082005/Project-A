import { pool } from "../db.js";

//student
export const getUserReservationsByStudentId = async (user_id) => {
    const res = await pool.query(
    `SELECT r.id,
    r.item_unit_id,
    i.name AS item_name, 
    iu.serial_number, 
    u.user_id, 
    r.borrow_date,
    r.actual_return_date,
    c.name AS course_name, 
    l.name AS lab_name FROM reservations r
    JOIN item_units iu ON r.item_unit_id = iu.id
    JOIN items i ON iu.item_id = i.id
    JOIN users u ON r.user_id = u.id
    JOIN timetable t ON r.timetable_id = t.id
    JOIN courses c ON t.course_id = c.id
    JOIN labs l ON iu.lab_id = l.id
    WHERE u.id = $1 ORDER BY r.borrow_date DESC`, [user_id]);
    return res.rows;
}

//admin
export const getAllReservations = async () => {
    const res = await pool.query(`
    SELECT r.id,
    i.name AS item_name, 
    iu.serial_number, 
    u.user_id, 
    r.borrow_date,
    r.actual_return_date,
    c.name AS course_name, 
    l.name AS lab_name FROM reservations r
    JOIN item_units iu ON r.item_unit_id = iu.id
    JOIN items i ON iu.item_id = i.id
    JOIN users u ON r.user_id = u.id
    JOIN timetable t ON r.timetable_id = t.id
    JOIN courses c ON t.course_id = c.id
    JOIN labs l ON iu.lab_id = l.id
    ORDER BY r.borrow_date DESC`);
    return res.rows;
}

//student reserves an item unit for a specific timetable
export const createReservation = async (item_unit_id,user_id,timetable_id) => {
    const res = await pool.query('INSERT INTO reservations (item_unit_id, user_id, timetable_id) VALUES ($1, $2, $3) RETURNING *', [item_unit_id, user_id, timetable_id]);
    return res.rows[0];
}

export const updateReservation = async (reservation_id) => {
    const res = await pool.query(
        `UPDATE reservations SET actual_return_date = NOW() WHERE id = $1 AND actual_return_date IS NULL RETURNING *`,
        [reservation_id]
        );
    return res.rows[0];
}
