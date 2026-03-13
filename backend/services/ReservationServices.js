import { getAllReservations, getUserReservationsByStudentId, createReservation, updateReservation} from "../models/Reservation.js";
import { pool } from "../db.js";

export const makeReservation = async (item_unit_id,user_id,timetable_id, scanned_item_unit_id) => {
    if (scanned_item_unit_id && scanned_item_unit_id !== item_unit_id) {
        throw new Error("Scanned item unit ID does not match expected item unit ID");
    }
    return await createReservation(item_unit_id,user_id,timetable_id);
}

export const getUserReservations= async (student_id) => {
    return await getUserReservationsByStudentId(student_id);
}

export const getAdminReservations = async () => {
    return await getAllReservations();
}

export const getAvailableItemsForStudent = async (user_id) => {

    const res = await pool.query(
        `SELECT
    t.id AS timetable_id,
    t.course_id,
    t.day_of_week,
    t.start_time,
    t.end_time,
    c.name AS course_name,
    ci.item_id,
    i.name AS item_name,
    iu.id AS item_unit_id,
    iu.serial_number,
    l.name AS lab_name
FROM timetable_user tu
JOIN timetable t ON t.id = tu.timetable_id
JOIN courses c ON c.id = t.course_id
JOIN course_item ci ON ci.course_id = t.course_id
JOIN items i ON i.id = ci.item_id
JOIN item_units iu ON iu.item_id = ci.item_id
JOIN labs l ON l.id = iu.lab_id
LEFT JOIN reservations r
    ON r.item_unit_id = iu.id
    AND r.timetable_id = t.id
    AND r.actual_return_date IS NULL
WHERE tu.user_id = $1
AND r.item_unit_id IS NULL;`,          
        [user_id]
    );

    return res.rows;
};

export const returnItem = async (reservation_id, actual_return_date) => {
    const res = await pool.query(
        `UPDATE reservations SET actual_return_date = $1 WHERE id = $2 RETURNING *`,
        [actual_return_date, reservation_id]
    );
    return res.rows[0];
}