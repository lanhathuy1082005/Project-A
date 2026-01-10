import "../db.js";
import { pool } from "../db.js";


const createUser = async (username, email, password_hash) => {
  await pool.query('INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)',[username, email, password_hash]);
}

const getUserByEmail = async (email) => {
  const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return res.rows[0];
}