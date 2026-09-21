import { db }                                            from '../utils/dbClient.js';
import { getUserReservations, getAllReservations }      from '../models/Reservation.js';
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

// The full lock/validate/insert/update sequence now runs as a single atomic
// transaction inside db-service (POST /reservations/borrow); this just
// guards against duplicate in-flight requests from the same Node instance.
export const makeReservation = async (scanned_item_unit_id, user_id) => {
  return withLock(`borrow:${scanned_item_unit_id}`, () =>
    db.post('/reservations/borrow', { item_unit_id: scanned_item_unit_id, user_id })
  );
};

export const returnItem = async ({ reservation_id, item_unit_id, scanned_item_unit_id }) => {
  validateQrMatch(scanned_item_unit_id, item_unit_id);

  const result = await db.post(`/reservations/${reservation_id}/return`, { item_unit_id });
  if (!result) throw new AppError('Reservation does not exist or already returned', 400);

  return result;
};
