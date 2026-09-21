import { db } from '../utils/dbClient.js';

export const createFeedback = async (userId, content) => {
  return db.post('/feedback', { user_id: userId, content });
};

export const getAllFeedback = async ({ limit, offset }) => {
  return db.get('/feedback', { limit, offset });
};
