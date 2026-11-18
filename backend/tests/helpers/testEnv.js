// Shared harness: a throwaway Postgres database cloned (schema only) from the dev
// database, a fake Python scan server, and the Express app on a random port.
//
// Requires the Postgres client tools (pg_dump, psql). Set PG_BIN if they are not on
// PATH; the Windows default install folder is tried automatically.
import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import fs   from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import bcrypt from 'bcrypt';
import pg   from 'pg';

const SOURCE_DB = process.env.TEST_SOURCE_DB_NAME || process.env.DB_NAME;
export const TEST_DB = process.env.TEST_DB_NAME || 'project_a_test';
if (TEST_DB === SOURCE_DB) throw new Error('TEST_DB_NAME must differ from the dev database');

const pgBin = (tool) => {
  const dirs = [process.env.PG_BIN, 'C:/Program Files/PostgreSQL/18/bin', 'C:/Program Files/PostgreSQL/17/bin']
    .filter(Boolean);
  for (const dir of dirs) {
    const file = path.join(dir, process.platform === 'win32' ? `${tool}.exe` : tool);
    if (fs.existsSync(file)) return file;
  }
  return tool;
};

const pgEnv = {
  ...process.env,
  PGUSER: process.env.DB_USER,
  PGPASSWORD: process.env.DB_PASSWORD,
  PGHOST: process.env.DB_HOST,
  PGPORT: String(process.env.DB_PORT || 5432),
};

const adminClient = (database) => new pg.Client({
  user: process.env.DB_USER, host: process.env.DB_HOST, password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 5432, database,
});

let created = false;
export const createTestDatabase = async () => {
  if (created) return;
  const admin = adminClient(SOURCE_DB);
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${TEST_DB}`);
  await admin.end();
  const schema = execFileSync(pgBin('pg_dump'), ['--schema-only', '--no-owner', '--no-privileges', SOURCE_DB],
    { env: pgEnv, maxBuffer: 64 * 1024 * 1024 });
  execFileSync(pgBin('psql'), ['-q', '-v', 'ON_ERROR_STOP=1', '-d', TEST_DB],
    { env: pgEnv, input: schema, stdio: ['pipe', 'ignore', 'inherit'] });
  created = true;
};

// ── Fixtures ─────────────────────────────────────────────────────────────────
export const PASSWORD = 'pw';
export const TOKENS = {
  uno: 'UNO00001',       // single, Arduino-UNO-R3, in course
  nano: 'NANO0001',      // single, Arduino-Nano-Every, in course, no lab
  kit: 'KIT00001',       // kit, 6 slots, in course
  other: 'OTHER001',     // single, item not in any course
};
export const link = (token) => `https://q.me-qr.com/${token}`;
export const UNITS = { uno: 1, nano: 2, kit: 3, other: 4, untagged: 5 };

export const seed = async (db) => {
  const hash = await bcrypt.hash(PASSWORD, 4);
  await db.query(`TRUNCATE kit_scans, single_item_scans, reservations, attendance, feedback,
    timetable_user, timetable, course_item, item_units, items, kit_types, labs, courses,
    users, roles RESTART IDENTITY CASCADE`);
  await db.query(`INSERT INTO roles (id, name) VALUES (1, 'student'), (2, 'admin')`);
  await db.query(`INSERT INTO users (id, password_hash, role_id)
                  VALUES ('s1', $1, 1), ('s2', $1, 1), ('admin', $1, 2)`, [hash]);
  await db.query(`INSERT INTO labs (id, name) VALUES (1, 'Lab A')`);
  await db.query(`INSERT INTO courses (id, name) VALUES (1, 'Embedded')`);
  await db.query(`INSERT INTO kit_types (id, name, slot_count) VALUES (1, 'Sensor kit', 6)`);
  await db.query(`INSERT INTO items (id, name, kit_type_id) VALUES
    (1, 'Arduino-UNO-R3', NULL), (2, 'Arduino-Nano-Every', NULL),
    (3, 'Sensor Kit Box', 1), (4, 'Arduino-Nano-33-BLE-Rev2', NULL)`);
  await db.query(`INSERT INTO course_item (course_id, item_id) VALUES (1, 1), (1, 2), (1, 3)`);
  await db.query(`INSERT INTO item_units (id, item_id, lab_id, status, qr_token) VALUES
    (1, 1, 1,    'Available', $1),
    (2, 2, NULL, 'Available', $2),
    (3, 3, 1,    'Available', $3),
    (4, 4, 1,    'Available', $4),
    (5, 1, 1,    'Available', NULL)`,
    [TOKENS.uno, TOKENS.nano, TOKENS.kit, TOKENS.other]);
  // An all-day class "today" in the lab's time zone, attended by s1 and s2.
  await db.query(`INSERT INTO timetable (id, course_id, day_of_week, start_time, end_time)
    VALUES (1, 1, EXTRACT(DOW FROM NOW() AT TIME ZONE $1), '00:00', '23:59:59')`,
    [process.env.LAB_TIMEZONE || 'Asia/Bangkok']);
  await db.query(`INSERT INTO timetable_user (timetable_id, user_id) VALUES (1, 's1'), (1, 's2')`);
  for (const t of ['roles', 'users', 'labs', 'courses', 'kit_types', 'items', 'item_units', 'timetable'])
    if (t !== 'users')
      await db.query(`SELECT setval(pg_get_serial_sequence('${t}', 'id'), (SELECT MAX(id) FROM ${t}))`);
};

// ── Fake scan model ──────────────────────────────────────────────────────────
export const JPEG_B64 = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]).toString('base64');

export const kitResult = (counts, { confidence = 0.95, threshold = 0.8, slots = 6 } = {}) => {
  const c = { empty: 0, sensor: 0, two: 0, ...counts };
  const status = confidence < threshold ? 'unsure'
    : c.empty + c.sensor + c.two !== slots ? 'wrong'
      : c.empty > 0 ? 'missing' : 'success';
  return {
    expected_slots: slots, empty_count: c.empty, sensor_count: c.sensor,
    two_sensor_count: c.two, status, confidence, confidence_threshold: threshold,
    model_version: 'fake-kit',
  };
};

export const det = (class_name, confidence = 0.95) =>
  ({ class_name, confidence, box: [10, 10, 100, 100] });
export const singleResult = (...detections) =>
  ({ detections, detection_threshold: 0.5, model_version: 'fake-single' });

export const startFakeModel = async () => {
  const state = { kit: () => kitResult({ sensor: 6 }), single: () => singleResult(), delayMs: 0 };
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', async () => {
      const body = JSON.parse(raw || '{}');
      if (state.delayMs) await new Promise((r) => setTimeout(r, state.delayMs));
      const result = req.url === '/scan-frames/kit' ? state.kit(body) : state.single(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  state.url = `http://127.0.0.1:${server.address().port}`;
  state.close = () => new Promise((r) => server.close(r));
  return state;
};

// ── App + HTTP client ────────────────────────────────────────────────────────
export const startApp = async (modelUrl) => {
  process.env.DB_NAME = TEST_DB;
  delete process.env.SSL_KEY_PATH;   // plain-HTTP test server: session cookie must not be Secure
  delete process.env.SSL_CERT_PATH;
  process.env.NODE_ENV = 'test';
  process.env.SCAN_MODEL_URL = modelUrl;
  process.env.SCAN_PREVIEW_TIMEOUT_MS = '300';
  process.env.SCAN_OFFICIAL_TIMEOUT_MS = '2000';
  process.env.SINGLE_SCAN_CONFIDENCE_THRESHOLD = '0.8';
  process.env.API_RATE_LIMIT_MAX = '100000';
  process.env.SCAN_FRAME_RATE_LIMIT_MAX = '100000';
  const { default: app } = await import('../../app.js');
  const { pool } = await import('../../config/db.js');
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;

  const request = async (method, url, body, cookie) => {
    const response = await fetch(`${base}${url}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null, headers: response.headers };
  };

  const login = async (id) => {
    const res = await request('POST', '/api/auth/login', { id, password: PASSWORD });
    if (res.status !== 200) throw new Error(`login ${id} failed: ${res.status}`);
    return res.headers.get('set-cookie').split(';')[0];
  };

  const close = async () => {
    await new Promise((r) => server.close(r));
    await pool.end();
  };
  return { request, login, pool, close };
};
