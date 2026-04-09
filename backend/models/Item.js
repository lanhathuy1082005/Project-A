import { pool } from "../config/db";

export const getAllItems = async () => {
  const { rows } = await pool.query(
    `SELECT * from items`
  );
  return rows;
};

export const addItemUnits = async (itemId, quantity) => {