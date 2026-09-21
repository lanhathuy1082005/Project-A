import { db } from '../utils/dbClient.js';

export const getAllLabs = async () => {
  const { data } = await db.get('/labs');
  return data;
};

export const getLabById = async (id) => {
  return db.get(`/labs/${id}`);
};
