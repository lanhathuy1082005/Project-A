import pkg from 'pg';
const { Pool } = pkg;

export const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'project_a',
  password: 'ananbeo',
  port: 5432,
});
