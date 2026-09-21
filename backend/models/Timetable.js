import { db } from '../utils/dbClient.js';

export const getAllClasses = async ({ limit, offset }) => {
  return db.get('/classes', { limit, offset });
};

export const getClassStudents = async (timetableId) => {
  const { data } = await db.get(`/classes/${timetableId}/students`);
  return data;
};

export const createClass = async (courseId, dayOfWeek, startTime, endTime) => {
  return db.post('/classes', {
    course_id: courseId, day_of_week: dayOfWeek, start_time: startTime, end_time: endTime,
  });
};

export const updateClass = async (id, courseId, dayOfWeek, startTime, endTime) => {
  return db.put(`/classes/${id}`, {
    course_id: courseId, day_of_week: dayOfWeek, start_time: startTime, end_time: endTime,
  });
};

export const deleteClass = async (id) => {
  return db.delete(`/classes/${id}`);
};

export const getTodaySessions = async () => {
  const { data } = await db.get('/sessions/today');
  return data;
};
