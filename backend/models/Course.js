import { db } from '../utils/dbClient.js';

export const getAllCourses = async () => {
  const { data } = await db.get('/courses');
  return data;
};
