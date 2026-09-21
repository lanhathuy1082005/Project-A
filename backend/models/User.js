import { db } from '../utils/dbClient.js';

export const getUserByUserId = async (id) => {
  return db.get(`/users/${encodeURIComponent(id)}`);
};

export const createUser = async (id, password_hash) => {
  return db.post('/users', { id, password_hash });
};

export const createAttendanceRecord = async (userId, timetableId) => {
  return db.post('/attendance', { user_id: userId, timetable_id: timetableId });
};

export const getValidTimetableForUser = async (userId) => {
  return db.get(`/users/${encodeURIComponent(userId)}/valid-timetable`);
};
