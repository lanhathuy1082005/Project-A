import pkg from 'pg';
const { Pool } = pkg;

export const pool = new Pool({
  user:     process.env.DB_USER,
  host:     process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port:     Number(process.env.DB_PORT) || 5432,
});

pool.on('error', (err) => {
  console.error('Unexpected DB client error:', err);
  process.exit(-1);
});
