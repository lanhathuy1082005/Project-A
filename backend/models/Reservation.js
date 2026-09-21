import { db } from '../utils/dbClient.js';

export const getUserReservations = async (user_id, { limit, offset }) => {
  return db.get(`/users/${encodeURIComponent(user_id)}/reservations`, { limit, offset });
};

export const getAllReservations = async ({ limit, offset, status, userId, classId, dateFrom, dateTo }) => {
  return db.get('/reservations', {
    limit, offset, status,
    user_id: userId, class_id: classId, date_from: dateFrom, date_to: dateTo,
  });
};

export const getReservationById = async (id) => {
  return db.get(`/reservations/${id}`);
};

export const markApproved = async (reservation_id) => {
  return db.post(`/reservations/${reservation_id}/approve`);
};

export const markMaintenance = async (reservation_id) => {
  return db.post(`/reservations/${reservation_id}/report-issue`);
};

// Pending returns (return submitted but not yet verified)
export const getPendingReturns = async ({ limit, offset }) => {
  return db.get('/reservations/pending-returns', { limit, offset });
};

// Logs - all reservations with full history (including returned)
export const getReservationLogs = async ({ limit, offset, userId, classId, dateFrom, dateTo }) => {
  return db.get('/reservations/logs', {
    limit, offset,
    user_id: userId, class_id: classId, date_from: dateFrom, date_to: dateTo,
  });
};

// Dashboard stats
export const getDashboardStats = async () => {
  return db.get('/reservations/stats/dashboard');
};
