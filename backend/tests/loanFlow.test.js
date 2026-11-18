import { test, before, after, beforeEach, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTestDatabase, seed, startFakeModel, startApp,
  TOKENS, UNITS, link, JPEG_B64, kitResult, singleResult, det,
} from './helpers/testEnv.js';

let model;
let app;
let s1;
let s2;
let adminCookie;

before(async () => {
  await createTestDatabase();
  model = await startFakeModel();
  app = await startApp(model.url);
});

after(async () => {
  await app?.close();
  await model?.close();
});

beforeEach(async () => {
  delete process.env.KIT_QR_REQUIRED;
  await seed(app.pool);
  model.kit = () => kitResult({ sensor: 6 });
  model.single = () => singleResult(det('QR-code'), det('Arduino-UNO-R3'));
  model.delayMs = 0;
  s1 ??= await app.login('s1');
  s2 ??= await app.login('s2');
  adminCookie ??= await app.login('admin');
});

const q = (sql, params) => app.pool.query(sql, params).then((r) => r.rows);
const unitStatus = async (id) => (await q('SELECT status FROM item_units WHERE id = $1', [id]))[0].status;

const singleFrame = (cookie, token, extra = {}) => app.request('POST', '/api/reservations/scan-frame/single',
  { qr_text: link(token), image_b64: JPEG_B64, ...extra }, cookie);
// Kits are picked by unit id while KIT_QR_REQUIRED is off (no kit stickers yet).
const kitFrame = (cookie, extra = {}) => app.request('POST', '/api/reservations/scan-frame/kit',
  { kit_unit_id: UNITS.kit, image_b64: JPEG_B64, ...extra }, cookie);
const kitReturnFrame = (cookie, reservationId, extra = {}) => app.request('POST', '/api/reservations/scan-frame/kit',
  { purpose: 'return', reservation_id: reservationId, image_b64: JPEG_B64, persist_scan: true, ...extra }, cookie);
const borrow = (cookie, token, scan) => app.request('POST', '/api/reservations',
  { qr_text: link(token), ...scan }, cookie);
const giveBack = (cookie, id, token, scan = {}) => app.request('PATCH', `/api/reservations/${id}/return`,
  { qr_text: link(token), ...scan }, cookie);

const borrowSingle = async (cookie = s1, token = TOKENS.uno) => {
  const scan = await singleFrame(cookie, token, { persist_scan: true });
  assert.equal(scan.status, 200, JSON.stringify(scan.body));
  const res = await borrow(cookie, token, { single_scan_id: scan.body.data.single_scan_id });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data;
};

const borrowKit = async (counts = { empty: 2, sensor: 3, two: 1 }) => {
  model.kit = () => kitResult(counts);
  const scan = await kitFrame(s1, { persist_scan: true });
  assert.equal(scan.status, 200, JSON.stringify(scan.body));
  const res = await app.request('POST', '/api/reservations',
    { kit_unit_id: UNITS.kit, kit_scan_id: scan.body.data.kit_scan_id }, s1);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data;
};

// ── /units/resolve ───────────────────────────────────────────────────────────
describe('POST /api/units/resolve', () => {
  test('resolves a registered link to its unit', async () => {
    const res = await app.request('POST', '/api/units/resolve', { qr_text: link(TOKENS.kit) }, s1);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data, {
      item_unit_id: UNITS.kit, is_kit: true, item_name: 'Sensor Kit Box', status: 'Available', slot_count: 6,
    });
  });
  test('rejects foreign links, old i:/k: payloads and unknown tokens', async () => {
    assert.equal((await app.request('POST', '/api/units/resolve', { qr_text: 'https://x.com/UNO00001' }, s1)).status, 400);
    assert.equal((await app.request('POST', '/api/units/resolve', { qr_text: 'i:1' }, s1)).status, 400);
    assert.equal((await app.request('POST', '/api/units/resolve', { qr_text: link('ZZZZ9999') }, s1)).status, 404);
  });
  test('requires login', async () => {
    assert.equal((await app.request('POST', '/api/units/resolve', { qr_text: link(TOKENS.uno) })).status, 401);
  });
});

// ── Checkout ─────────────────────────────────────────────────────────────────
describe('single-item checkout', () => {
  test('success: scan is saved, redeemed once, unit becomes Borrowed', async () => {
    const reservation = await borrowSingle();
    assert.equal(await unitStatus(UNITS.uno), 'Borrowed');
    const scans = await q('SELECT reservation_id, purpose, status, detected_item_id FROM single_item_scans');
    assert.deepEqual(scans, [{ reservation_id: reservation.id, purpose: 'checkout', status: 'success', detected_item_id: 1 }]);
  });

  test('wrong item class is reported and not saved', async () => {
    model.single = () => singleResult(det('QR-code'), det('Arduino-Nano-Every'));
    const res = await singleFrame(s1, TOKENS.uno, { persist_scan: true });
    assert.equal(res.body.data.status, 'wrong');
    assert.equal(res.body.data.single_scan_id, null);
    assert.equal((await q('SELECT COUNT(*)::int n FROM single_item_scans'))[0].n, 0);
  });

  test('low confidence, missing QR or two items are unsure', async () => {
    model.single = () => singleResult(det('QR-code'), det('Arduino-UNO-R3', 0.7));
    assert.equal((await singleFrame(s1, TOKENS.uno)).body.data.status, 'unsure');
    model.single = () => singleResult(det('Arduino-UNO-R3'));
    assert.equal((await singleFrame(s1, TOKENS.uno)).body.data.status, 'unsure');
    model.single = () => singleResult(det('QR-code'), det('Arduino-UNO-R3'), det('Arduino-UNO-R3'));
    assert.equal((await singleFrame(s1, TOKENS.uno)).body.data.status, 'unsure');
  });

  test('borrow needs a scan of this unit by this user, unused and unexpired', async () => {
    assert.equal((await borrow(s1, TOKENS.uno, {})).status, 400);
    const scan = await singleFrame(s2, TOKENS.uno, { persist_scan: true });
    assert.equal((await borrow(s1, TOKENS.uno, { single_scan_id: scan.body.data.single_scan_id })).status, 409);
    const unoScan = await singleFrame(s1, TOKENS.uno, { persist_scan: true });
    assert.equal((await borrow(s1, TOKENS.nano, { single_scan_id: unoScan.body.data.single_scan_id })).status, 409);
    await q("UPDATE single_item_scans SET expires_at = NOW() - INTERVAL '1 minute'");
    assert.equal((await borrow(s1, TOKENS.uno, { single_scan_id: unoScan.body.data.single_scan_id })).status, 409);
    assert.equal(await unitStatus(UNITS.uno), 'Available');
  });

  test('a kit scan cannot borrow a single item', async () => {
    const res = await borrow(s1, TOKENS.uno, { kit_scan_id: 1 });
    assert.equal(res.status, 400);
  });

  test('item outside the student\'s current course is refused', async () => {
    model.single = () => singleResult(det('QR-code'), det('Arduino-Nano-33-BLE-Rev2'));
    const scan = await singleFrame(s1, TOKENS.other, { persist_scan: true });
    const res = await borrow(s1, TOKENS.other, { single_scan_id: scan.body.data.single_scan_id });
    assert.equal(res.status, 403);
    assert.equal(await unitStatus(UNITS.other), 'Available');
  });

  test('an already borrowed unit cannot be scanned for checkout', async () => {
    await borrowSingle();
    assert.equal((await singleFrame(s2, TOKENS.uno)).status, 409);
  });
});

describe('kit checkout and the empty-kit rule', () => {
  test('partially empty kit can be borrowed', async () => {
    await borrowKit({ empty: 2, sensor: 3, two: 1 });
    assert.equal(await unitStatus(UNITS.kit), 'Borrowed');
  });

  test('fully empty kit is not confirmable and not saved (Node layer)', async () => {
    model.kit = () => kitResult({ empty: 6 });
    const res = await kitFrame(s1, { persist_scan: true });
    assert.equal(res.body.data.status, 'missing');
    assert.equal(res.body.data.confirmable, false);
    assert.equal(res.body.data.fully_empty, true);
    assert.equal(res.body.data.kit_scan_id, null);
  });

  test('DB CHECK rejects a fully empty checkout scan (DB layer)', async () => {
    await assert.rejects(q(`INSERT INTO kit_scans (kit_unit_id, user_id, purpose, empty_count, sensor_count,
        two_sensor_count, expected_slots, status, confidence, confidence_threshold, model_version, expires_at)
      VALUES (3, 's1', 'checkout', 6, 0, 0, 6, 'missing', 0.9, 0.8, 'x', NOW() + INTERVAL '1 hour')`),
    /kit_scans_checkout_not_empty_check/);
    // the same counts are allowed as return evidence
    await q(`INSERT INTO kit_scans (kit_unit_id, user_id, purpose, empty_count, sensor_count,
        two_sensor_count, expected_slots, status, confidence, confidence_threshold, model_version, expires_at)
      VALUES (3, 's1', 'return', 6, 0, 0, 6, 'missing', 0.9, 0.8, 'x', NOW() + INTERVAL '1 hour')`);
  });

  test('unsure and wrong kit scans are not saved at checkout', async () => {
    model.kit = () => kitResult({ sensor: 6 }, { confidence: 0.6 });
    assert.equal((await kitFrame(s1, { persist_scan: true })).body.data.kit_scan_id, null);
    model.kit = () => kitResult({ sensor: 5 });
    const wrong = await kitFrame(s1, { persist_scan: true });
    assert.equal(wrong.body.data.status, 'wrong');
    assert.equal(wrong.body.data.kit_scan_id, null);
  });

  test('kit picked by unit id while KIT_QR_REQUIRED is off; refused once it is on', async () => {
    const kits = await app.request('GET', '/api/reservations/kits', null, s1);
    assert.equal(kits.body.kit_qr_required, false);
    assert.deepEqual(kits.body.data.map((k) => k.unit_id), [UNITS.kit]);
    process.env.KIT_QR_REQUIRED = 'true';
    assert.equal((await app.request('GET', '/api/reservations/kits', null, s1)).body.kit_qr_required, true);
    const byId = await kitFrame(s1);
    assert.equal(byId.status, 400);
    assert.match(byId.body.message, /Scan the QR code/);
    const byQr = await kitFrame(s1, { kit_unit_id: undefined, qr_text: link(TOKENS.kit), persist_scan: true });
    assert.equal(byQr.status, 200);
    const res = await borrow(s1, TOKENS.kit, { kit_scan_id: byQr.body.data.kit_scan_id });
    assert.equal(res.status, 201);
  });

  test('kit_unit_id cannot pick a single item', async () => {
    assert.equal((await kitFrame(s1, { kit_unit_id: UNITS.uno })).status, 400);
    const res = await app.request('POST', '/api/reservations', { kit_unit_id: UNITS.uno, single_scan_id: 1 }, s1);
    assert.equal(res.status, 400);
  });

  test('kit QR on the single endpoint (and vice versa) is rejected', async () => {
    assert.equal((await singleFrame(s1, TOKENS.kit)).status, 400);
    const res = await app.request('POST', '/api/reservations/scan-frame/kit',
      { qr_text: link(TOKENS.uno), image_b64: JPEG_B64 }, s1);
    assert.equal(res.status, 400);
  });
});

describe('scan model failures', () => {
  test('inconsistent model output is a 502', async () => {
    model.kit = () => ({ ...kitResult({ empty: 1, sensor: 5 }), status: 'success' });
    assert.equal((await kitFrame(s1)).status, 502);
  });
  test('preview frames time out fast, official scans get the long timeout', async () => {
    model.delayMs = 600; // test preview timeout is 300 ms, official 2000 ms
    const preview = await kitFrame(s1);
    assert.equal(preview.status, 503);
    assert.match(preview.body.message, /timed out/);
    const official = await kitFrame(s1, { persist_scan: true });
    assert.equal(official.status, 200);
  });
});

// ── Return ───────────────────────────────────────────────────────────────────
describe('return', () => {
  test('single item, matching scan: closes loan without flag', async () => {
    const loan = await borrowSingle();
    const scan = await singleFrame(s1, TOKENS.uno, { purpose: 'return', reservation_id: loan.id, persist_scan: true });
    assert.equal(scan.body.data.return_flag, null);
    const res = await giveBack(s1, loan.id, TOKENS.uno, { single_scan_id: scan.body.data.single_scan_id });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.return_flag, null);
    assert.equal(await unitStatus(UNITS.uno), 'Needs Checking');
    const scans = await q("SELECT purpose, reservation_id FROM single_item_scans ORDER BY id");
    assert.deepEqual(scans, [
      { purpose: 'checkout', reservation_id: loan.id },
      { purpose: 'return', reservation_id: loan.id },
    ]);
  });

  test('single item, wrong class: return is flagged and the failed scan attached', async () => {
    const loan = await borrowSingle();
    model.single = () => singleResult(det('QR-code'), det('Arduino-Nano-Every'));
    const scan = await singleFrame(s1, TOKENS.uno, { purpose: 'return', reservation_id: loan.id, persist_scan: true });
    assert.equal(scan.body.data.return_flag, 'wrong');
    assert.ok(scan.body.data.single_scan_id);
    const res = await giveBack(s1, loan.id, TOKENS.uno, { single_scan_id: scan.body.data.single_scan_id });
    assert.equal(res.body.data.return_flag, 'wrong');
    const [row] = await q("SELECT status, detected_item_id FROM single_item_scans WHERE purpose = 'return'");
    assert.deepEqual(row, { status: 'wrong', detected_item_id: 2 });
  });

  test('no scan at all (model down): return closes with scan_unavailable', async () => {
    const loan = await borrowSingle();
    const res = await giveBack(s1, loan.id, TOKENS.uno);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.return_flag, 'scan_unavailable');
    assert.equal(await unitStatus(UNITS.uno), 'Needs Checking');
  });

  test('kit return needs no QR, only the loan; other students cannot scan it', async () => {
    const loan = await borrowKit();
    assert.equal((await kitReturnFrame(s2, loan.id)).status, 404);
    model.kit = () => kitResult({ empty: 2, sensor: 3, two: 1 });
    const scan = await kitReturnFrame(s1, loan.id);
    assert.equal(scan.status, 200);
    assert.equal(scan.body.data.item_unit_id, UNITS.kit);
    const res = await app.request('PATCH', `/api/reservations/${loan.id}/return`,
      { kit_scan_id: scan.body.data.kit_scan_id }, s1);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.return_flag, null);
  });

  test('single-item return frames still need the matching QR', async () => {
    const loan = await borrowSingle();
    const frame = (qr_text) => app.request('POST', '/api/reservations/scan-frame/single',
      { purpose: 'return', reservation_id: loan.id, image_b64: JPEG_B64, qr_text }, s1);
    assert.equal((await frame(undefined)).status, 400);
    assert.equal((await frame(link(TOKENS.nano))).status, 400);
    assert.equal((await frame(link(TOKENS.uno))).status, 200);
  });

  test('only the borrower can return, and only once', async () => {
    const loan = await borrowSingle();
    assert.equal((await giveBack(s2, loan.id, TOKENS.uno)).status, 404);
    assert.equal((await singleFrame(s2, TOKENS.uno, { purpose: 'return', reservation_id: loan.id })).status, 404);
    assert.equal((await giveBack(s1, loan.id, TOKENS.uno)).status, 200);
    assert.equal((await giveBack(s1, loan.id, TOKENS.uno)).status, 404);
  });

  test('QR must be the loaned unit; the unit comes from the reservation', async () => {
    const loan = await borrowSingle();
    const res = await giveBack(s1, loan.id, TOKENS.nano);
    assert.equal(res.status, 400);
    assert.match(res.body.message, /does not belong/);
    assert.equal((await giveBack(s1, loan.id, null)).status, 400);
    assert.equal((await q('SELECT actual_return_date FROM reservations WHERE id = $1', [loan.id]))[0].actual_return_date, null);
  });

  test('a checkout scan cannot be reused as a return scan; failure rolls back', async () => {
    const loan = await borrowSingle();
    const [checkout] = await q(`INSERT INTO single_item_scans (item_unit_id, user_id, purpose, status,
        detected_item_class, detected_item_id, item_confidence, qr_confidence, confidence_threshold,
        model_version, expires_at)
      VALUES ($1, 's1', 'checkout', 'success', 'Arduino-UNO-R3', 1, 0.9, 0.9, 0.8, 'x',
        NOW() + INTERVAL '1 hour') RETURNING id`, [UNITS.uno]);
    const res = await giveBack(s1, loan.id, TOKENS.uno, { single_scan_id: checkout.id });
    assert.equal(res.status, 409);
    assert.equal(await unitStatus(UNITS.uno), 'Borrowed');
  });

  test('kit: per-class rule against the checkout counts', async () => {
    const cases = [
      [{ empty: 2, sensor: 3, two: 1 }, {}, null],                 // same as checkout
      [{ empty: 1, sensor: 4, two: 1 }, {}, null],                 // an extra piece is fine
      [{ empty: 3, sensor: 2, two: 1 }, {}, 'count_mismatch'],     // lost a piece
      [{ empty: 2, sensor: 4, two: 0 }, {}, 'count_mismatch'],     // 2xsensor swapped for sensor
      [{ empty: 2, sensor: 3, two: 1 }, { confidence: 0.5 }, 'unsure'],
      [{ empty: 2, sensor: 2, two: 1 }, {}, 'wrong'],              // counts do not add up
    ];
    for (const [counts, options, expected] of cases) {
      await seed(app.pool);
      const loan = await borrowKit({ empty: 2, sensor: 3, two: 1 });
      model.kit = () => kitResult(counts, options);
      const scan = await kitReturnFrame(s1, loan.id);
      assert.equal(scan.status, 200);
      assert.equal(scan.body.data.return_flag, expected, JSON.stringify(counts));
      assert.ok(scan.body.data.kit_scan_id, 'return scans are always saved');
      const res = await app.request('PATCH', `/api/reservations/${loan.id}/return`,
        { kit_scan_id: scan.body.data.kit_scan_id }, s1);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.return_flag, expected);
      assert.equal(await unitStatus(UNITS.kit), 'Needs Checking');
    }
  });
});

// ── Views and admin ──────────────────────────────────────────────────────────
describe('views and admin', () => {
  test('/me lists a loan whose unit has no lab, with kit_type_id', async () => {
    await borrowSingle(s1, TOKENS.uno);
    model.single = () => singleResult(det('QR-code'), det('Arduino-Nano-Every'));
    await borrowSingle(s1, TOKENS.nano);
    const res = await app.request('GET', '/api/reservations/me', null, s1);
    assert.equal(res.body.total, 2);
    const nano = res.body.data.find((r) => r.item_unit_id === UNITS.nano);
    assert.equal(nano.lab_name, null);
    assert.equal(nano.kit_type_id, null);
  });

  test('flagged returns show their flag in pending-returns', async () => {
    const loan = await borrowSingle();
    await giveBack(s1, loan.id, TOKENS.uno);
    const res = await app.request('GET', '/api/admin/pending-returns', null, adminCookie);
    assert.equal(res.status, 200);
    assert.equal(res.body.data[0].id, loan.id);
    assert.equal(res.body.data[0].return_flag, 'scan_unavailable');
  });

  test('admin registers, rejects duplicate and clears QR tokens', async () => {
    const put = (id, qr, cookie = adminCookie) =>
      app.request('PUT', `/api/admin/item-units/${id}/qr-token`, { qr }, cookie);
    const ok = await put(UNITS.untagged, 'https://q.me-qr.com/9ljwb7qc');
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.qr_token, '9ljwb7qc');
    assert.equal((await put(UNITS.untagged, 'AbCd1234')).body.data.qr_token, 'AbCd1234');
    assert.equal((await put(UNITS.untagged, TOKENS.uno)).status, 409);
    assert.equal((await put(UNITS.untagged, 'https://evil.com/9ljwb7qc')).status, 400);
    assert.equal((await put(999, 'ZZZZ0000')).status, 404);
    assert.equal((await put(UNITS.untagged, 'ZZZZ0000', s1)).status, 403);
    assert.equal((await put(UNITS.untagged, null)).body.data.qr_token, null);
  });

  test('item_units.status CHECK rejects unknown statuses as a 400', async () => {
    const res = await app.request('PATCH', `/api/admin/item-units/${UNITS.uno}`, { status: 'Maintenance' }, adminCookie);
    assert.equal(res.status, 400);
  });
});
