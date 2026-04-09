import { pool } from "../config/db";

export const getAllItems = async () => {
  const { rows } = await pool.query(
    `SELECT * from items`
  );
  return rows;
};

export const addItem = async (name) => {
  const { rows } = await pool.query(
    `INSERT INTO items (name)
     VALUES ($1)
     RETURNING name`,
    [name]
  );
  return rows[0];
};

export const addItemUnits = async (itemId, serialNumber, labId) => {
    const { rows } = await pool.query(
        `INSERT INTO item_units (item_id, serial_number, lab_id)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [itemId, serialNumber, labId]
    );
    return rows[0];
}

