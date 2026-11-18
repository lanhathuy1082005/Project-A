import { pool }                                          from '../config/db.js';
import { createReservation, markReturned,
         getUserReservations, getAllReservations }        from '../models/Reservation.js';
import { AppError }                                      from '../utils/AppError.js';

const SCAN_STATUSES = new Set(['success', 'missing', 'wrong', 'unsure']);
const CONFIRMABLE_SCAN_STATUSES = new Set(['success', 'missing']);
const SINGLE_ITEM_CLASSES = new Set([
  'Arduino-Nano-33-BLE-Rev2',
  'Arduino-Nano-Every',
  'Arduino-Nano-Motor-Carrier',
  'Arduino-Nano-R4-Headers',
  'Arduino-UNO-R3',
  'Arduino-UNO-R4-WiFi',
]);
const MAX_IMAGE_BYTES = 7 * 1024 * 1024;
const DEFAULT_SCAN_MODEL_URL = 'http://127.0.0.1:8000';

// ── In-process lock (single instance). Use Redis if scaling to multiple instances ───
const activeLocks = new Set();

const withLock = async (key, fn) => {
  if (activeLocks.has(key)) throw new AppError('Item is currently being processed, please try again later', 409);
  activeLocks.add(key);
  try   { return await fn(); }
  finally { activeLocks.delete(key); }
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const validateQrMatch = (scanned, expected) => {
  if (scanned && scanned !== expected)
    throw new AppError('QR code does not match', 400);
};

const decodeJpeg = (imageB64) => {
  if (typeof imageB64 !== 'string' || imageB64.length === 0)
    throw new AppError('A scan image is required', 400);
  const image = Buffer.from(imageB64, 'base64');
  if (image.toString('base64') !== imageB64)
    throw new AppError('Scan image must contain valid base64', 400);
  if (!image.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])))
    throw new AppError('Scan image must be a JPEG image', 400);
  if (image.length > MAX_IMAGE_BYTES)
    throw new AppError('Scan image exceeds the maximum size', 413);
  return image;
};

const getPhysicalItem = async (itemUnitId) => {
  const id = Number(itemUnitId);
  if (!Number.isSafeInteger(id) || id < 1)
    throw new AppError('item_unit_id must be a positive integer', 400);
  const { rows } = await pool.query(
    `SELECT iu.id AS item_unit_id, i.id AS item_id, i.name AS item_name,
            i.kit_type_id, iu.status
     FROM item_units iu
     JOIN items i ON i.id = iu.item_id
     WHERE iu.id = $1`,
    [id],
  );
  if (!rows[0]) throw new AppError('Item unit not found', 404);
  return rows[0];
};

const callKitModel = async (kitTypeId, imageB64) => {
  const { rows } = await pool.query(
    'SELECT slot_count FROM kit_types WHERE id = $1',
    [kitTypeId],
  );
  const expectedSlots = rows[0]?.slot_count;
  if (!Number.isSafeInteger(expectedSlots) || expectedSlots < 1)
    throw new AppError('This kit type has no valid slot count', 409);

  const image = decodeJpeg(imageB64);
  let response;
  try {
    const modelUrl = (
      process.env.SCAN_MODEL_URL
      || process.env.FACE_API_URL
      || DEFAULT_SCAN_MODEL_URL
    ).replace(/\/+$/, '');
    response = await fetch(`${modelUrl}/scan-frames/kit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_b64: image.toString('base64'),
        expected_slots: expectedSlots,
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    throw new AppError(
      error?.name === 'TimeoutError'
        ? 'Kit scan model timed out'
        : 'Kit scan model is unavailable',
      503,
    );
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new AppError('Kit scan model returned an invalid response', 502);
  }
  if (!response.ok) throw new AppError('Kit scan model rejected the image', 502);
  if (
    !result
    || !SCAN_STATUSES.has(result.status)
    || !Number.isSafeInteger(result.expected_slots)
    || result.expected_slots !== expectedSlots
    || !Number.isSafeInteger(result.empty_count)
    || result.empty_count < 0
    || !Number.isSafeInteger(result.sensor_count)
    || result.sensor_count < 0
    || !Number.isSafeInteger(result.two_sensor_count)
    || result.two_sensor_count < 0
    || !Number.isFinite(result.confidence)
    || result.confidence < 0
    || result.confidence > 1
    || !Number.isFinite(result.confidence_threshold)
    || result.confidence_threshold < 0
    || result.confidence_threshold > 1
    || typeof result.model_version !== 'string'
  ) {
    throw new AppError('Kit scan model returned invalid results', 502);
  }
  const countsMatch =
    result.empty_count + result.sensor_count + result.two_sensor_count === expectedSlots;
  const expectedStatus = result.confidence < result.confidence_threshold
    ? 'unsure'
    : !countsMatch
      ? 'wrong'
      : result.empty_count > 0
        ? 'missing'
        : 'success';
  if (result.status !== expectedStatus) {
    throw new AppError('Kit scan model returned inconsistent results', 502);
  }
  return result;
};

const normalizeItemClass = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]/g, '');

const callSingleModel = async (imageB64) => {
  const image = decodeJpeg(imageB64);
  let response;
  try {
    const modelUrl = (
      process.env.SCAN_MODEL_URL
      || process.env.FACE_API_URL
      || DEFAULT_SCAN_MODEL_URL
    ).replace(/\/+$/, '');
    response = await fetch(`${modelUrl}/scan-frames/single`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_b64: image.toString('base64') }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    throw new AppError(
      error?.name === 'TimeoutError'
        ? 'Single-item scan model timed out'
        : 'Single-item scan model is unavailable',
      503,
    );
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new AppError('Single-item scan model returned an invalid response', 502);
  }
  if (!response.ok) throw new AppError('Single-item scan model rejected the image', 502);
  if (
    !result
    || !Array.isArray(result.detections)
    || !Number.isFinite(result.detection_threshold)
    || result.detection_threshold < 0
    || result.detection_threshold > 1
    || typeof result.model_version !== 'string'
  ) {
    throw new AppError('Single-item scan model returned invalid results', 502);
  }

  const detections = result.detections.map((detection) => {
    if (
      !detection
      || (detection.class_name !== 'QR-code'
        && !SINGLE_ITEM_CLASSES.has(detection.class_name))
      || !Number.isFinite(detection.confidence)
      || detection.confidence < result.detection_threshold
      || detection.confidence > 1
      || !Array.isArray(detection.box)
      || detection.box.length !== 4
      || !detection.box.every(Number.isFinite)
      || detection.box[2] <= detection.box[0]
      || detection.box[3] <= detection.box[1]
    ) {
      throw new AppError('Single-item scan model returned an invalid detection', 502);
    }
    return detection;
  });

  return {
    detections,
    detection_threshold: result.detection_threshold,
    model_version: result.model_version,
  };
};

export const verifySingleFrame = async (
  { item_unit_id, image_b64, persist_scan = false },
  user_id,
) => {
  const item = await getPhysicalItem(item_unit_id);
  if (item.kit_type_id !== null)
    throw new AppError('This QR code identifies a kit, not a single item', 400);
  if (!['Available', 'Needs Checking'].includes(item.status))
    throw new AppError('This item is not currently available to borrow', 409);

  const result = await callSingleModel(image_b64);
  const qrDetections = result.detections.filter(
    (detection) => detection.class_name === 'QR-code',
  );
  const itemDetections = result.detections.filter(
    (detection) => detection.class_name !== 'QR-code',
  );
  let detectedItem = null;
  let status = 'unsure';
  if (qrDetections.length === 1 && itemDetections.length === 1) {
    detectedItem = itemDetections[0];
    status = normalizeItemClass(detectedItem.class_name)
      === normalizeItemClass(item.item_name)
      ? 'success'
      : 'wrong';
  }

  const scanResult = {
    status,
    detected_item_class: detectedItem?.class_name ?? null,
    item_confidence: detectedItem?.confidence ?? null,
    qr_confidence: qrDetections.length === 1
      ? qrDetections[0].confidence
      : null,
    confidence_threshold: result.detection_threshold,
    model_version: result.model_version,
    single_scan_id: null,
  };

  if (persist_scan === true && status === 'success') {
    const { rows } = await pool.query(
      `INSERT INTO single_item_scans (
         item_unit_id, user_id, detected_item_class, item_confidence,
         qr_confidence, confidence_threshold, model_version,
         expires_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '15 minutes')
       RETURNING id`,
      [
        item.item_unit_id,
        user_id,
        scanResult.detected_item_class,
        scanResult.item_confidence,
        scanResult.qr_confidence,
        scanResult.confidence_threshold,
        scanResult.model_version,
      ],
    );
    scanResult.single_scan_id = rows[0].id;
  }
  return scanResult;
};

const assertKitScanPasses = (result) => {
  if (result.status === 'success') return;
  if (result.status === 'missing')
    throw new AppError(`${result.empty_count} kit slot(s) appear empty`, 400);
  if (result.status === 'wrong')
    throw new AppError('Kit contents could not be counted consistently; reframe the box', 400);
  throw new AppError('Tilt the box so its contents can be checked', 400);
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
  return rows;
};

export const verifyKitFrame = async (
  { kit_unit_id, image_b64, persist_scan = false },
  user_id,
) => {
  const item = await getPhysicalItem(kit_unit_id);
  if (item.kit_type_id === null)
    throw new AppError('This QR code does not identify a kit box', 400);
  if (!['Available', 'Needs Checking'].includes(item.status))
    throw new AppError('This kit is not currently available to borrow', 409);

  const result = await callKitModel(item.kit_type_id, image_b64);
  if (persist_scan === true && CONFIRMABLE_SCAN_STATUSES.has(result.status)) {
    const { rows } = await pool.query(
      `INSERT INTO kit_scans (
         kit_unit_id, user_id, empty_count, sensor_count, two_sensor_count,
         expected_slots, status, confidence, confidence_threshold,
         model_version, expires_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW() + INTERVAL '15 minutes')
       RETURNING id`,
      [
        item.item_unit_id,
        user_id,
        result.empty_count,
        result.sensor_count,
        result.two_sensor_count,
        result.expected_slots,
        result.status,
        result.confidence,
        result.confidence_threshold,
        result.model_version,
      ],
    );
    result.kit_scan_id = rows[0].id;
  } else {
    result.kit_scan_id = null;
  }
  return result;
};

export const makeReservation = async (
  scanned_item_unit_id,
  user_id,
  kit_scan_id,
  single_scan_id,
) => {

  return withLock(`borrow:${scanned_item_unit_id}`, async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock row item_unit
      const { rows: itemRows } = await client.query(
        `SELECT iu.id, iu.item_id, iu.status, i.kit_type_id
         FROM item_units iu
         JOIN items i ON i.id = iu.item_id
         WHERE iu.id = $1
         FOR UPDATE`,
        [scanned_item_unit_id]
      );

      const item_unit_id = itemRows[0]?.id;
      const item_id      = itemRows[0]?.item_id;
      const unitStatus   = itemRows[0]?.status;
      const kit_type_id  = itemRows[0]?.kit_type_id;

      if (!item_unit_id) throw new AppError('Item unit not found', 404);

      // Block borrowing broken items; allow Available and Needs Checking
      if (unitStatus === 'Broken') {
        throw new AppError('This device is broken and cannot be borrowed', 400);
      }
      if (unitStatus === 'Borrowed') {
        throw new AppError('Device is already being borrowed', 409);
      }

      let kitScan = null;
      let singleScan = null;
      if (kit_type_id !== null) {
        if (single_scan_id !== undefined && single_scan_id !== null)
          throw new AppError('A single-item scan cannot be used to borrow a kit', 400);
        const scanId = Number(kit_scan_id);
        if (!Number.isSafeInteger(scanId) || scanId < 1)
          throw new AppError('A verified kit scan is required to borrow this kit', 400);
        const { rows: scanRows } = await client.query(
          `SELECT id, status
           FROM kit_scans
           WHERE id = $1
             AND kit_unit_id = $2
             AND user_id = $3
             AND reservation_id IS NULL
             AND expires_at > NOW()
           FOR UPDATE`,
          [scanId, item_unit_id, user_id],
        );
        kitScan = scanRows[0] ?? null;
        if (!kitScan || !CONFIRMABLE_SCAN_STATUSES.has(kitScan.status))
          throw new AppError('Kit scan is missing or expired; scan the kit again', 409);
      } else {
        if (kit_scan_id !== undefined && kit_scan_id !== null)
          throw new AppError('A kit scan cannot be used to borrow a single item', 400);
        const scanId = Number(single_scan_id);
        if (!Number.isSafeInteger(scanId) || scanId < 1)
          throw new AppError('A verified single-item scan is required to borrow this item', 400);
        const { rows: scanRows } = await client.query(
          `SELECT id
           FROM single_item_scans
           WHERE id = $1
             AND item_unit_id = $2
             AND user_id = $3
             AND reservation_id IS NULL
             AND expires_at > NOW()
           FOR UPDATE`,
          [scanId, item_unit_id, user_id],
        );
        singleScan = scanRows[0] ?? null;
        if (!singleScan)
          throw new AppError('Single-item scan is missing or expired; scan the item again', 409);
      }

      const { rows: courseRows } = await client.query(
        `SELECT ci.course_id FROM course_item ci
        JOIN items i ON ci.item_id = i.id
        WHERE i.id = $1`,
        [item_id]
      );

      const course_id = courseRows[0]?.course_id;
      if (!course_id) throw new AppError('Item is not available for the current course', 400);

      const { rows: timetableRows } = await client.query(
        `SELECT tu.timetable_id FROM timetable_user tu
        JOIN timetable t ON tu.timetable_id = t.id
        WHERE t.start_time <= NOW()::TIME AND t.end_time >= NOW()::TIME
        AND t.day_of_week = EXTRACT(DOW FROM NOW())
        AND tu.user_id = $1
        LIMIT 1`,
        [user_id]
      );

      const timetable_id = timetableRows[0]?.timetable_id;
      if (!timetable_id) throw new AppError('No active timetable found for the user', 404);

      const reservation = await createReservation(item_unit_id, user_id, timetable_id, client);
      if (!reservation) throw new AppError('Device is already being borrowed by another user', 409);

      if (kitScan) {
        const { rows: linkedScans } = await client.query(
          `UPDATE kit_scans
           SET reservation_id = $1, confirmed_at = NOW()
           WHERE id = $2 AND reservation_id IS NULL
           RETURNING id`,
          [reservation.id, kitScan.id],
        );
        if (!linkedScans[0])
          throw new AppError('Kit scan was already used; scan the kit again', 409);
      }
      if (singleScan) {
        const { rows: linkedScans } = await client.query(
          `UPDATE single_item_scans
           SET reservation_id = $1, confirmed_at = NOW()
           WHERE id = $2 AND reservation_id IS NULL
           RETURNING id`,
          [reservation.id, singleScan.id],
        );
        if (!linkedScans[0])
          throw new AppError('Single-item scan was already used; scan the item again', 409);
      }

      await client.query(
        `UPDATE item_units SET status = 'Borrowed' WHERE id = $1`,
        [item_unit_id]
      );

      await client.query('COMMIT');
      return reservation;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  });
};

export const returnItem = async ({
  reservation_id,
  item_unit_id,
  scanned_item_unit_id,
  image_b64,
}) => {
  validateQrMatch(scanned_item_unit_id, item_unit_id);
  const item = await getPhysicalItem(scanned_item_unit_id);
  if (item.kit_type_id !== null) {
    const scan = await callKitModel(item.kit_type_id, image_b64);
    assertKitScanPasses(scan);
  }

  const result = await markReturned(reservation_id);
  if (!result) throw new AppError('Reservation does not exist or already returned', 400);

  // Set item unit to Needs Checking — admin will verify condition before it goes Available
  await pool.query(
    `UPDATE item_units SET status = 'Needs Checking' WHERE id = $1`,
    [item_unit_id]
  );

  return result;
};
