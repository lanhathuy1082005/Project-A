import { pool }                                   from '../config/db.js';
import { createReservation, getUserReservations,
         getAllReservations }                     from '../models/Reservation.js';
import { AppError }                               from '../utils/AppError.js';
import { parseQrToken }                           from '../utils/qrParser.js';
import { callKitModel, callSingleModel }          from './scanModelClient.js';
import { evaluateSingle, isKitBorrowable,
         kitReturnFlag, singleReturnFlag }        from './scanRules.js';

const SCAN_TTL = "INTERVAL '15 minutes'";
const BORROWABLE_STATUSES = ['Available', 'Needs Checking'];
const singleThreshold = () => {
  const value = Number(process.env.SINGLE_SCAN_CONFIDENCE_THRESHOLD ?? 0.8);
  if (!(value >= 0 && value <= 1))
    throw new AppError('SINGLE_SCAN_CONFIDENCE_THRESHOLD must be between 0 and 1', 500);
  return value;
};
const labTimeZone = () => process.env.LAB_TIMEZONE || 'Asia/Bangkok';
// Kit boxes will carry QR stickers; until they do, a student picks the kit unit from
// the list. Set KIT_QR_REQUIRED=true once every kit box has a registered sticker.
export const kitQrRequired = () => process.env.KIT_QR_REQUIRED === 'true';

// ── Helpers ───────────────────────────────────────────────────────────────────
const requireToken = (qr_text) => {
  const token = parseQrToken(qr_text);
  if (!token) throw new AppError('This is not a lab item QR code', 400);
  return token;
};

const positiveId = (value, label) => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1)
    throw new AppError(`${label} must be a positive integer`, 400);
  return id;
};

const optionalId = (value, label) =>
  value === undefined || value === null ? null : positiveId(value, label);

const UNIT_COLUMNS = `
  iu.id AS item_unit_id, iu.status, iu.qr_token,
  i.id AS item_id, i.name AS item_name, i.kit_type_id, kt.slot_count`;
const UNIT_FROM = `
  FROM item_units iu
  JOIN items i ON i.id = iu.item_id
  LEFT JOIN kit_types kt ON kt.id = i.kit_type_id`;

const findUnitByToken = async (db, token, { lock = false } = {}) => {
  const { rows } = await db.query(
    `SELECT ${UNIT_COLUMNS} ${UNIT_FROM} WHERE iu.qr_token = $1 ${lock ? 'FOR UPDATE OF iu' : ''}`,
    [token],
  );
  if (!rows[0]) throw new AppError('This QR code is not registered to any item', 404);
  return rows[0];
};

const findUnitById = async (db, id, { lock = false } = {}) => {
  const { rows } = await db.query(
    `SELECT ${UNIT_COLUMNS} ${UNIT_FROM} WHERE iu.id = $1 ${lock ? 'FOR UPDATE OF iu' : ''}`,
    [id],
  );
  if (!rows[0]) throw new AppError('Item unit not found', 404);
  return rows[0];
};

// Checkout identifies the unit by its QR sticker. Kits may instead be picked by unit
// id while KIT_QR_REQUIRED is off.
const findCheckoutUnit = async (db, { qr_text, kit_unit_id }, { lock = false } = {}) => {
  if (qr_text !== undefined && qr_text !== null)
    return findUnitByToken(db, requireToken(qr_text), { lock });
  if (kit_unit_id !== undefined && kit_unit_id !== null) {
    if (kitQrRequired()) throw new AppError('Scan the QR code on the kit box', 400);
    const unit = await findUnitById(db, positiveId(kit_unit_id, 'kit_unit_id'), { lock });
    if (unit.kit_type_id === null)
      throw new AppError('This unit is a single item; scan its QR code instead', 400);
    return unit;
  }
  throw new AppError('Scan the QR code on the item', 400);
};

const assertKitConfigured = (unit) => {
  if (unit.kit_type_id !== null && !(unit.slot_count > 0))
    throw new AppError('This kit type has no valid slot count', 409);
};

const purgeExpiredScans = async () => {
  // Unredeemed scans are only useful for 15 minutes; keep a day for debugging.
  await pool.query(
    `DELETE FROM kit_scans
      WHERE reservation_id IS NULL AND expires_at < NOW() - INTERVAL '1 day'`,
  );
  await pool.query(
    `DELETE FROM single_item_scans
      WHERE reservation_id IS NULL AND expires_at < NOW() - INTERVAL '1 day'`,
  );
};

// Resolves the unit a scan frame is about. Checkout: by QR (or picked kit unit id) and
// the unit must be borrowable. Return: the unit comes from the caller's open loan;
// single items must also show their QR, kits are checked by contents only.
const loadScanTarget = async (body, user_id, kind) => {
  const purpose = body.purpose ?? 'checkout';
  if (purpose !== 'checkout' && purpose !== 'return')
    throw new AppError("purpose must be 'checkout' or 'return'", 400);

  if (purpose === 'checkout') {
    const unit = await findCheckoutUnit(pool, body);
    assertKitConfigured(unit);
    if (!BORROWABLE_STATUSES.includes(unit.status))
      throw new AppError('This item is not currently available to borrow', 409);
    return { unit, purpose };
  }

  const reservationId = positiveId(body.reservation_id, 'reservation_id');
  const { rows } = await pool.query(
    `SELECT id, item_unit_id FROM reservations
      WHERE id = $1 AND user_id = $2 AND actual_return_date IS NULL`,
    [reservationId, user_id],
  );
  if (!rows[0]) throw new AppError('You have no open loan with this id', 404);
  const unit = await findUnitById(pool, rows[0].item_unit_id);
  assertKitConfigured(unit);
  if (kind === 'single' && unit.kit_type_id === null) assertQrMatches(unit, body.qr_text);
  return { unit, purpose, reservationId };
};

function assertQrMatches(unit, qr_text) {
  const token = requireToken(qr_text);
  if (!unit.qr_token)
    throw new AppError('This item has no registered QR code; ask the lab admin', 409);
  if (unit.qr_token !== token)
    throw new AppError('This QR code does not belong to the item you are returning', 400);
}

const checkoutKitCounts = async (db, reservationId) => {
  const { rows } = await db.query(
    `SELECT empty_count, two_sensor_count FROM kit_scans
      WHERE reservation_id = $1 AND purpose = 'checkout'`,
    [reservationId],
  );
  return rows[0] ?? null;
};

// ── Public API ────────────────────────────────────────────────────────────────
export const getMyReservations = (user_id, pagination) =>
  getUserReservations(user_id, pagination);

export const getAdminReservations = (pagination) =>
  getAllReservations(pagination);

export const getAvailableKits = async () => {
  const { rows } = await pool.query(
    `SELECT iu.id AS unit_id, iu.status,
            i.name AS item_name, kt.id AS kit_type_id,
            kt.name AS kit_type_name, kt.slot_count
     FROM item_units iu
     JOIN items i ON i.id = iu.item_id
     JOIN kit_types kt ON kt.id = i.kit_type_id
     WHERE iu.status IN ('Available', 'Needs Checking')
     ORDER BY i.name, iu.id`,
  );
  return { kits: rows, kit_qr_required: kitQrRequired() };
};

export const resolveUnit = async ({ qr_text }) => {
  const unit = await findUnitByToken(pool, requireToken(qr_text));
  return {
    item_unit_id: unit.item_unit_id,
    is_kit: unit.kit_type_id !== null,
    item_name: unit.item_name,
    status: unit.status,
    slot_count: unit.slot_count ?? null,
  };
};

export const verifyKitFrame = async (body, user_id) => {
  const { unit, purpose, reservationId } = await loadScanTarget(body, user_id, 'kit');
  if (unit.kit_type_id === null)
    throw new AppError('This QR code identifies a single item, not a kit', 400);
  const persist = body.persist_scan === true;

  const result = await callKitModel(unit.slot_count, body.image_b64, { official: persist });

  let returnFlag = null;
  let confirmable;
  if (purpose === 'checkout') {
    confirmable = isKitBorrowable(result);
  } else {
    returnFlag = kitReturnFlag(result, await checkoutKitCounts(pool, reservationId));
    confirmable = returnFlag === null;
  }

  let kitScanId = null;
  // Checkout keeps only borrowable scans; return keeps every official scan so a
  // flagged return carries its evidence.
  if (persist && (purpose === 'return' || confirmable)) {
    const { rows } = await pool.query(
      `INSERT INTO kit_scans (
         kit_unit_id, user_id, purpose, empty_count, sensor_count, two_sensor_count,
         expected_slots, status, confidence, confidence_threshold, model_version, expires_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW() + ${SCAN_TTL})
       RETURNING id`,
      [
        unit.item_unit_id, user_id, purpose,
        result.empty_count, result.sensor_count, result.two_sensor_count,
        result.expected_slots, result.status, result.confidence,
        result.confidence_threshold, result.model_version,
      ],
    );
    kitScanId = rows[0].id;
    await purgeExpiredScans();
  }

  return {
    ...result,
    item_unit_id: unit.item_unit_id,
    purpose,
    confirmable,
    fully_empty: result.empty_count >= result.expected_slots,
    return_flag: returnFlag,
    kit_scan_id: kitScanId,
  };
};

export const verifySingleFrame = async (body, user_id) => {
  const { unit, purpose } = await loadScanTarget(body, user_id, 'single');
  if (unit.kit_type_id !== null)
    throw new AppError('This QR code identifies a kit, not a single item', 400);
  const persist = body.persist_scan === true;
  const threshold = singleThreshold();

  const model = await callSingleModel(body.image_b64, { official: persist });
  const evaluation = evaluateSingle(model.detections, unit.item_name, threshold);
  const returnFlag = purpose === 'return' ? singleReturnFlag(evaluation) : null;
  const confirmable = evaluation.status === 'success';

  let singleScanId = null;
  if (persist && (purpose === 'return' || confirmable)) {
    const { rows } = await pool.query(
      `INSERT INTO single_item_scans (
         item_unit_id, user_id, purpose, status, detected_item_class, detected_item_id,
         item_confidence, qr_confidence, confidence_threshold, model_version, expires_at
       )
       VALUES ($1, $2, $3, $4, $5::text,
               (SELECT id FROM items WHERE name = $5::text),
               $6, $7, $8, $9, NOW() + ${SCAN_TTL})
       RETURNING id`,
      [
        unit.item_unit_id, user_id, purpose, evaluation.status,
        evaluation.detected_item_class, evaluation.item_confidence,
        evaluation.qr_confidence, threshold, model.model_version,
      ],
    );
    singleScanId = rows[0].id;
    await purgeExpiredScans();
  }

  return {
    ...evaluation,
    item_unit_id: unit.item_unit_id,
    purpose,
    confirmable,
    return_flag: returnFlag,
    confidence_threshold: threshold,
    model_version: model.model_version,
    single_scan_id: singleScanId,
  };
};

export const makeReservation = async ({ qr_text, kit_unit_id, kit_scan_id, single_scan_id }, user_id) => {
  const kitScanId = optionalId(kit_scan_id, 'kit_scan_id');
  const singleScanId = optionalId(single_scan_id, 'single_scan_id');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const unit = await findCheckoutUnit(client, { qr_text, kit_unit_id }, { lock: true });
    if (unit.status === 'Broken')
      throw new AppError('This device is broken and cannot be borrowed', 400);
    if (unit.status === 'Borrowed')
      throw new AppError('Device is already being borrowed', 409);

    let scanTable;
    let scanId;
    if (unit.kit_type_id !== null) {
      if (singleScanId !== null)
        throw new AppError('A single-item scan cannot be used to borrow a kit', 400);
      if (kitScanId === null)
        throw new AppError('A verified kit scan is required to borrow this kit', 400);
      const { rows } = await client.query(
        `SELECT id, status, empty_count, expected_slots FROM kit_scans
          WHERE id = $1 AND kit_unit_id = $2 AND user_id = $3 AND purpose = 'checkout'
            AND reservation_id IS NULL AND expires_at > NOW()
          FOR UPDATE`,
        [kitScanId, unit.item_unit_id, user_id],
      );
      if (!rows[0])
        throw new AppError('Kit scan is missing or expired; scan the kit again', 409);
      if (!isKitBorrowable(rows[0]))
        throw new AppError('A completely empty kit cannot be borrowed', 400);
      scanTable = 'kit_scans';
      scanId = rows[0].id;
    } else {
      if (kitScanId !== null)
        throw new AppError('A kit scan cannot be used to borrow a single item', 400);
      if (singleScanId === null)
        throw new AppError('A verified single-item scan is required to borrow this item', 400);
      const { rows } = await client.query(
        `SELECT id FROM single_item_scans
          WHERE id = $1 AND item_unit_id = $2 AND user_id = $3 AND purpose = 'checkout'
            AND status = 'success' AND reservation_id IS NULL AND expires_at > NOW()
          FOR UPDATE`,
        [singleScanId, unit.item_unit_id, user_id],
      );
      if (!rows[0])
        throw new AppError('Single-item scan is missing or expired; scan the item again', 409);
      scanTable = 'single_item_scans';
      scanId = rows[0].id;
    }

    // The student must be in a class right now whose course uses this item.
    const { rows: timetableRows } = await client.query(
      `SELECT tu.timetable_id
         FROM timetable_user tu
         JOIN timetable t    ON t.id = tu.timetable_id
         JOIN course_item ci ON ci.course_id = t.course_id AND ci.item_id = $2
        WHERE tu.user_id = $1
          AND t.day_of_week = EXTRACT(DOW FROM (NOW() AT TIME ZONE $3))
          AND (NOW() AT TIME ZONE $3)::time BETWEEN t.start_time AND t.end_time
        ORDER BY t.start_time
        LIMIT 1`,
      [user_id, unit.item_id, labTimeZone()],
    );
    const timetable_id = timetableRows[0]?.timetable_id;
    if (!timetable_id)
      throw new AppError('This item is not part of a class you have right now', 403);

    const reservation = await createReservation(unit.item_unit_id, user_id, timetable_id, client);
    if (!reservation) throw new AppError('Device is already being borrowed by another user', 409);

    await client.query(
      `UPDATE ${scanTable} SET reservation_id = $1, confirmed_at = NOW() WHERE id = $2`,
      [reservation.id, scanId],
    );
    await client.query(
      `UPDATE item_units SET status = 'Borrowed' WHERE id = $1`,
      [unit.item_unit_id],
    );

    await client.query('COMMIT');
    return reservation;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Closes the caller's open loan. The unit comes from the reservation; a single item's
// scanned QR must match it (kits are checked by contents only), and the return scan
// (if any) decides the flag. A missing or failed
// scan never blocks the return: the loan closes with a flag for the admin.
export const returnItem = async (
  { reservation_id, qr_text, kit_scan_id, single_scan_id },
  user_id,
) => {
  const reservationId = positiveId(reservation_id, 'reservation id');
  const kitScanId = optionalId(kit_scan_id, 'kit_scan_id');
  const singleScanId = optionalId(single_scan_id, 'single_scan_id');
  if (kitScanId !== null && singleScanId !== null)
    throw new AppError('Send either a kit scan or a single-item scan, not both', 400);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: reservationRows } = await client.query(
      `SELECT id, item_unit_id FROM reservations
        WHERE id = $1 AND user_id = $2 AND actual_return_date IS NULL
        FOR UPDATE`,
      [reservationId, user_id],
    );
    const reservation = reservationRows[0];
    if (!reservation) throw new AppError('You have no open loan with this id', 404);

    const { rows: unitRows } = await client.query(
      `SELECT ${UNIT_COLUMNS} ${UNIT_FROM} WHERE iu.id = $1 FOR UPDATE OF iu`,
      [reservation.item_unit_id],
    );
    const unit = unitRows[0];
    const isKit = unit.kit_type_id !== null;
    if (!isKit) assertQrMatches(unit, qr_text);
    if (isKit && singleScanId !== null)
      throw new AppError('A single-item scan cannot be used to return a kit', 400);
    if (!isKit && kitScanId !== null)
      throw new AppError('A kit scan cannot be used to return a single item', 400);

    let returnFlag = 'scan_unavailable';
    let scanTable = null;
    let scanId = null;
    if (isKit && kitScanId !== null) {
      const { rows } = await client.query(
        `SELECT id, status, empty_count, two_sensor_count FROM kit_scans
          WHERE id = $1 AND kit_unit_id = $2 AND user_id = $3 AND purpose = 'return'
            AND reservation_id IS NULL AND expires_at > NOW()
          FOR UPDATE`,
        [kitScanId, unit.item_unit_id, user_id],
      );
      if (!rows[0]) throw new AppError('Return scan is missing or expired; scan again', 409);
      returnFlag = kitReturnFlag(rows[0], await checkoutKitCounts(client, reservation.id));
      scanTable = 'kit_scans';
      scanId = rows[0].id;
    } else if (!isKit && singleScanId !== null) {
      const { rows } = await client.query(
        `SELECT id, status FROM single_item_scans
          WHERE id = $1 AND item_unit_id = $2 AND user_id = $3 AND purpose = 'return'
            AND reservation_id IS NULL AND expires_at > NOW()
          FOR UPDATE`,
        [singleScanId, unit.item_unit_id, user_id],
      );
      if (!rows[0]) throw new AppError('Return scan is missing or expired; scan again', 409);
      returnFlag = singleReturnFlag(rows[0]);
      scanTable = 'single_item_scans';
      scanId = rows[0].id;
    }

    const { rows: closed } = await client.query(
      `UPDATE reservations
          SET actual_return_date = NOW(), return_flag = $2
        WHERE id = $1
        RETURNING *`,
      [reservation.id, returnFlag],
    );
    if (scanTable) {
      await client.query(
        `UPDATE ${scanTable} SET reservation_id = $1, confirmed_at = NOW() WHERE id = $2`,
        [reservation.id, scanId],
      );
    }
    // The admin verifies condition before the unit goes back to Available.
    await client.query(
      `UPDATE item_units SET status = 'Needs Checking' WHERE id = $1`,
      [unit.item_unit_id],
    );

    await client.query('COMMIT');
    return closed[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const registerUnitQrToken = async (itemUnitId, { qr }) => {
  const id = positiveId(itemUnitId, 'item unit id');
  let token = null;
  if (qr !== null) {
    token = typeof qr === 'string' && /^[A-Za-z0-9]{8}$/.test(qr.trim())
      ? qr.trim()
      : parseQrToken(qr);
    if (!token)
      throw new AppError('qr must be a q.me-qr.com link, an 8-character token, or null', 400);
  }
  try {
    const { rows } = await pool.query(
      `UPDATE item_units SET qr_token = $1 WHERE id = $2 RETURNING id, item_id, status, qr_token`,
      [token, id],
    );
    if (!rows[0]) throw new AppError('Item unit not found', 404);
    return rows[0];
  } catch (error) {
    if (error.code === '23505')
      throw new AppError('This QR code is already registered to another unit', 409);
    throw error;
  }
};
