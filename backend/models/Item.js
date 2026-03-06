import { pool } from "../db";

export const getItemIdByCourseId = async (course_id) => {
    const res = await pool.query('SELECT item_id FROM course_item WHERE course_id = $1', [course_id]);
    return res.rows;
}

export const getItemUnitByItemId = async (item_id) => {
    const res = await pool.query('SELECT * FROM item_units WHERE item_id = $1', [item_id]);
    return res.rows;
}
