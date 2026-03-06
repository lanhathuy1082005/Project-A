import { getAllReservations, getUserReservationsByStudentId, createReservation} from "../models/Reservation.js";
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
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = now.toTimeString().slice(0, 8); // 'HH:MM:SS'

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
        JOIN timetables t ON t.id = tu.timetable_id
        JOIN courses c ON c.id = t.course_id
        JOIN course_item ci ON ci.course_id = t.course_id
        JOIN items i ON i.id = ci.item_id
        JOIN item_units iu ON iu.item_id = ci.item_id
        JOIN labs l ON l.id = iu.lab_id
        LEFT JOIN reservations r ON r.item_unit_id = iu.id AND r.timetable_id = t.id
        WHERE tu.user_id = $1
           AND t.day_of_week = $2
           AND t.start_time <= $3::time
           AND t.end_time >= $3::time
           AND (r.item_unit_id IS NULL OR r.actual_return_date IS NOT NULL)`,          
        [user_id, dayOfWeek, currentTime]
    );

    return res.rows;
};