// Minimal migration runner for database/migrations.
//
//   node scripts/migrate.js            apply every pending NNN_name.sql
//   node scripts/migrate.js down       revert the latest applied migration (NNN_name.down.sql)
//   node scripts/migrate.js status     list applied / pending migrations
//
// Each new migration runs inside one transaction together with its bookkeeping row.
// Migrations 001–003 were applied by hand before this runner existed; on first run
// they are recorded as applied when their tables already exist.
import 'dotenv/config';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg   from 'pg';

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../database/migrations',
);
const UP_FILE = /^(\d{3})_[a-z0-9_]+\.sql$/;

export const listMigrations = () =>
  fs.readdirSync(MIGRATIONS_DIR)
    .filter((name) => UP_FILE.test(name) && !name.endsWith('.down.sql'))
    .sort()
    .map((name) => ({
      version: name.slice(0, 3),
      name,
      upPath: path.join(MIGRATIONS_DIR, name),
      downPath: path.join(MIGRATIONS_DIR, name.replace(/\.sql$/, '.down.sql')),
    }));

const ensureTable = async (client) => {
  const { rows } = await client.query(`SELECT to_regclass('public.schema_migrations') AS t`);
  if (rows[0].t) return;
  await client.query(`
    CREATE TABLE schema_migrations (
      version    TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  const { rows: existing } = await client.query(`
    SELECT to_regclass('public.kit_types')         AS v001,
           to_regclass('public.kit_scans')         AS v002,
           to_regclass('public.single_item_scans') AS v003`);
  for (const migration of listMigrations()) {
    if (existing[0][`v${migration.version}`]) {
      await client.query(
        'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
        [migration.version, migration.name],
      );
      console.log(`baseline: recorded ${migration.name} as already applied`);
    }
  }
};

const applied = async (client) => {
  const { rows } = await client.query('SELECT version FROM schema_migrations ORDER BY version');
  return new Set(rows.map((row) => row.version));
};

const runInTransaction = async (client, sql, bookkeeping) => {
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await bookkeeping();
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
};

export const migrateUp = async (client, { log = console.log } = {}) => {
  await ensureTable(client);
  const done = await applied(client);
  for (const migration of listMigrations()) {
    if (done.has(migration.version)) continue;
    const sql = fs.readFileSync(migration.upPath, 'utf8');
    if (/^\s*BEGIN\s*;/im.test(sql))
      throw new Error(`${migration.name} manages its own transaction; new migrations must not`);
    await runInTransaction(client, sql, () => client.query(
      'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
      [migration.version, migration.name],
    ));
    log(`applied ${migration.name}`);
  }
};

export const migrateDown = async (client, { log = console.log } = {}) => {
  await ensureTable(client);
  const { rows } = await client.query(
    'SELECT version, name FROM schema_migrations ORDER BY version DESC LIMIT 1',
  );
  if (!rows[0]) { log('nothing to revert'); return; }
  const migration = listMigrations().find((m) => m.version === rows[0].version);
  if (!migration || !fs.existsSync(migration.downPath))
    throw new Error(`no down migration for ${rows[0].name}`);
  const sql = fs.readFileSync(migration.downPath, 'utf8');
  await runInTransaction(client, sql, () => client.query(
    'DELETE FROM schema_migrations WHERE version = $1',
    [migration.version],
  ));
  log(`reverted ${migration.name}`);
};

const main = async () => {
  const client = new pg.Client({
    user:     process.env.DB_USER,
    host:     process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port:     Number(process.env.DB_PORT) || 5432,
  });
  await client.connect();
  try {
    const command = process.argv[2] ?? 'up';
    if (command === 'up') await migrateUp(client);
    else if (command === 'down') await migrateDown(client);
    else if (command === 'status') {
      await ensureTable(client);
      const done = await applied(client);
      for (const m of listMigrations())
        console.log(`${done.has(m.version) ? 'applied' : 'pending'}  ${m.name}`);
    } else throw new Error(`unknown command: ${command}`);
  } finally {
    await client.end();
  }
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exit(1); });
}
