import { pool } from '../config/db.js';

export const getAllClasses = async ({ limit, offset }) => {
  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT t.id, t.day_of_week, t.start_time, t.end_time,
              c.id AS course_id, c.name AS course_name
       FROM timetable t
       JOIN courses c ON c.id = t.course_id
       ORDER BY t.day_of_week, t.start_time
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
    pool.query('SELECT COUNT(*) FROM timetable'),
  ]);
  return { data: rows.rows, total: parseInt(count.rows[0].count) };
};

export const getClassStudents = async (timetableId) => {
  const { rows } = await pool.query(
    `SELECT u.id AS user_id, u.created_at
     FROM timetable_user tu
     JOIN users u ON u.id = tu.user_id
     WHERE tu.timetable_id = $1
     ORDER BY u.id`,
    [timetableId]
  );
  return rows;
};

export const createClass = async (courseId, dayOfWeek, startTime, endTime) => {
  const { rows } = await pool.query(
    `INSERT INTO timetable (course_id, day_of_week, start_time, end_time)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [courseId, dayOfWeek, startTime, endTime]
  );
  return rows[0];
};

export const updateClass = async (id, courseId, dayOfWeek, startTime, endTime) => {
  const { rows } = await pool.query(
    `UPDATE timetable
     SET course_id = $1, day_of_week = $2, start_time = $3, end_time = $4
     WHERE id = $5
     RETURNING *`,
    [courseId, dayOfWeek, startTime, endTime, id]
  );
  return rows[0] ?? null;
};

export const deleteClass = async (id) => {
  const { rows } = await pool.query(
    `DELETE FROM timetable WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0] ?? null;
};

export const getTodaySessions = async () => {
  const { rows } = await pool.query(
    `SELECT t.id, t.start_time, t.end_time, c.name AS course_name
     FROM timetable t
     JOIN courses c ON c.id = t.course_id
     WHERE t.day_of_week = EXTRACT(DOW FROM NOW())
     ORDER BY t.start_time`
  );
  return rows;
};
