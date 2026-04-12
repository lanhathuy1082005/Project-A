import { pool }                                          from '../config/db.js';
import { createReservation, markReturned,
         getUserReservations, getAllReservations }        from '../models/Reservation.js';
import { AppError }                                      from '../utils/AppError.js';

// ── In-process lock (single instance). Use Redis if scaling to multiple instances ───
const activeLocks = new Set();

const withLock = async (key, fn) => {
  if (activeLocks.has(key)) throw new AppError('Item is currently being processed, please try again later', 409);
  activeLocks.add(key);
  try   { return await fn(); }
  finally { activeLocks.delete(key); }
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const validateQrMatch = (scanned, expected) => {
  if (scanned && scanned !== expected)
    throw new AppError('QR code does not match', 400);
};

// ── Public API ────────────────────────────────────────────────────────────────
export const getMyReservations = (user_id, pagination) =>
  getUserReservations(user_id, pagination);

export const getAdminReservations = (pagination) =>
  getAllReservations(pagination);

export const makeReservation = async (scanned_item_unit_id, user_id) => {

  return withLock(`borrow:${scanned_item_unit_id}`, async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock row item_unit
      const { rows: itemRows } = await client.query(
        `SELECT id, item_id, status FROM item_units WHERE id = $1 FOR UPDATE`,
        [scanned_item_unit_id]
      );

      const item_unit_id = itemRows[0]?.id;
      const item_id      = itemRows[0]?.item_id;
      const unitStatus   = itemRows[0]?.status;

      if (!item_unit_id) throw new AppError('Item unit not found', 404);

      // Block borrowing broken items; allow Available and Needs Checking
      if (unitStatus === 'Broken') {
        throw new AppError('This device is broken and cannot be borrowed', 400);
      }
      if (unitStatus === 'Borrowed') {
        throw new AppError('Device is already being borrowed', 409);
      }

      const { rows: courseRows } = await client.query(
        `SELECT ci.course_id FROM course_item ci
        JOIN items i ON ci.item_id = i.id
        WHERE i.id = $1`,
        [item_id]
      );

      const course_id = courseRows[0]?.course_id;
      if (!course_id) throw new AppError('Item is not available for the current course', 400);

      const { rows: timetableRows } = await client.query(
        `SELECT tu.timetable_id FROM timetable_user tu
        JOIN timetable t ON tu.timetable_id = t.id
        WHERE t.start_time <= NOW()::TIME AND t.end_time >= NOW()::TIME
        AND t.day_of_week = EXTRACT(DOW FROM NOW())
        AND tu.user_id = $1
        LIMIT 1`,
        [user_id]
      );

      const timetable_id = timetableRows[0]?.timetable_id;
      if (!timetable_id) throw new AppError('No active timetable found for the user', 404);

      const reservation = await createReservation(item_unit_id, user_id, timetable_id, client);
      if (!reservation) throw new AppError('Device is already being borrowed by another user', 409);

      await client.query(
        `UPDATE item_units SET status = 'Borrowed' WHERE id = $1`,
        [item_unit_id]
      );

      await client.query('COMMIT');
      return reservation;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  });
};

export const returnItem = async ({ reservation_id, item_unit_id, scanned_item_unit_id }) => {
  validateQrMatch(scanned_item_unit_id, item_unit_id);

  const result = await markReturned(reservation_id);
  if (!result) throw new AppError('Reservation does not exist or already returned', 400);

  // Set item unit to Needs Checking — admin will verify condition before it goes Available
  await pool.query(
    `UPDATE item_units SET status = 'Needs Checking' WHERE id = $1`,
    [item_unit_id]
  );

  return result;
};
