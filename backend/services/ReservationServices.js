import { getAllReservations, getUserReservationsByStudentId, createReservation, updateReservation} from "../models/Reservation.js";
import { pool } from "../db.js";

export const makeReservation = async (item_unit_id, user_id, timetable_id, scanned_item_unit_id) => {
    if (scanned_item_unit_id && scanned_item_unit_id !== item_unit_id) {
        throw new Error("Scanned item unit ID does not match expected item unit ID");
    }
    return await createReservation(item_unit_id,user_id,timetable_id);
}

export const getUserReservations= async (user_id) => {
    return await getUserReservationsByStudentId(user_id);
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

    for (const row of res.rows) {
        row.availability_id = `${row.item_unit_id}-${row.timetable_id}`; // Add availability_id to each row
    }

    return res.rows;
};

export const returnItem = async (reservation_id, scanned_reservation_id) => {
    if (scanned_reservation_id && scanned_reservation_id !== reservation_id) {
        throw new Error("Scanned reservation ID does not match expected reservation ID");
    }
    return await updateReservation(reservation_id);
}