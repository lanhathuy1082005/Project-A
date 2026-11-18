import { ApiError, client } from './client';

export interface Reservation {
  id: number;
  item_id: number | null;
  item_unit_id: number;
  item_name: string | null;
  user_id: string;
  borrow_date: string | null;
  actual_return_date: string | null;
  course_name: string | null;
  lab_name: string | null;
}

export interface ReservationPage {
  data: Reservation[];
  total: number;
}

export interface AvailableKit {
  unit_id: number;
  status: 'Available' | 'Needs Checking';
  item_name: string;
  kit_type_id: number;
  kit_type_name: string;
  slot_count: number;
}

export interface KitScanResult {
  expected_slots: number;
  empty_count: number;
  sensor_count: number;
  two_sensor_count: number;
  status: ScanStatus;
  confidence: number;
  confidence_threshold: number;
  model_version: string;
  kit_scan_id: number | null;
}

export interface SingleScanResult {
  status: 'success' | 'wrong' | 'unsure';
  detected_item_class: string | null;
  item_confidence: number | null;
  qr_confidence: number | null;
  confidence_threshold: number;
  model_version: string;
  single_scan_id: number | null;
}

export type ScanStatus = 'success' | 'missing' | 'wrong' | 'unsure';
type SingleScanStatus = SingleScanResult['status'];

export interface ScanConfirmation {
  unitId: number;
  mode: 'single' | 'kit';
  imageB64?: string;
  kitScanId?: number;
  singleScanId?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const scanStatuses: ReadonlySet<string> = new Set([
  'success',
  'missing',
  'wrong',
  'unsure',
]);

function isScanStatus(value: unknown): value is ScanStatus {
  return typeof value === 'string' && scanStatuses.has(value);
}

function isSingleScanStatus(value: unknown): value is SingleScanStatus {
  return value === 'success' || value === 'wrong' || value === 'unsure';
}

function parseConfidence(value: unknown, field: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new ApiError(`The API returned an invalid scan ${field}.`);
  }
  return parsed;
}

function parseNonnegativeInteger(value: unknown, field: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new ApiError(`The API returned an invalid scan ${field}.`);
  }
  return parsed;
}

function parseKitScanResult(value: unknown): KitScanResult {
  if (
    !isRecord(value)
    || typeof value.model_version !== 'string'
    || !isScanStatus(value.status)
  ) {
    throw new ApiError('The API returned an invalid kit scan result.');
  }
  const expectedSlots = toNumber(value.expected_slots, 'expected slot count');
  const emptyCount = parseNonnegativeInteger(value.empty_count, 'empty count');
  const sensorCount = parseNonnegativeInteger(value.sensor_count, 'sensor count');
  const twoSensorCount = parseNonnegativeInteger(
    value.two_sensor_count,
    '2xsensor count',
  );
  const confidence = parseConfidence(value.confidence, 'confidence');
  const confidenceThreshold = parseConfidence(
    value.confidence_threshold,
    'confidence threshold',
  );
  const countsMatch = emptyCount + sensorCount + twoSensorCount === expectedSlots;
  const expectedStatus: ScanStatus = confidence < confidenceThreshold
    ? 'unsure'
    : !countsMatch
      ? 'wrong'
      : emptyCount > 0
        ? 'missing'
        : 'success';
  if (value.status !== expectedStatus) {
    throw new ApiError('The API returned inconsistent kit scan results.');
  }
  const kitScanId = value.kit_scan_id === null || value.kit_scan_id === undefined
    ? null
    : parseNonnegativeInteger(value.kit_scan_id, 'kit scan ID');
  if (kitScanId === 0) {
    throw new ApiError('The API returned an invalid kit scan ID.');
  }
  return {
    expected_slots: expectedSlots,
    empty_count: emptyCount,
    sensor_count: sensorCount,
    two_sensor_count: twoSensorCount,
    status: expectedStatus,
    confidence,
    confidence_threshold: confidenceThreshold,
    model_version: value.model_version,
    kit_scan_id: kitScanId,
  };
}

function parseSingleScanResult(value: unknown): SingleScanResult {
  if (
    !isRecord(value)
    || !isSingleScanStatus(value.status)
    || typeof value.model_version !== 'string'
  ) {
    throw new ApiError('The API returned an invalid single-item scan result.');
  }
  const nullableConfidence = (confidence: unknown, field: string) =>
    confidence === null || confidence === undefined
      ? null
      : parseConfidence(confidence, field);
  const scanId = value.single_scan_id === null || value.single_scan_id === undefined
    ? null
    : parseNonnegativeInteger(value.single_scan_id, 'single scan ID');
  if (scanId === 0) {
    throw new ApiError('The API returned an invalid single scan ID.');
  }
  const detectedClass =
    value.detected_item_class === null || value.detected_item_class === undefined
      ? null
      : value.detected_item_class;
  if (detectedClass !== null && typeof detectedClass !== 'string') {
    throw new ApiError('The API returned an invalid detected item class.');
  }
  return {
    status: value.status,
    detected_item_class: detectedClass,
    item_confidence: nullableConfidence(value.item_confidence, 'item confidence'),
    qr_confidence: nullableConfidence(value.qr_confidence, 'QR confidence'),
    confidence_threshold: parseConfidence(
      value.confidence_threshold,
      'confidence threshold',
    ),
    model_version: value.model_version,
    single_scan_id: scanId,
  };
}

function unwrapScanResult(value: unknown): unknown {
  if (!isRecord(value) || !('data' in value)) {
    throw new ApiError('The API returned an invalid scan response.');
  }
  return value.data;
}

function toNumber(value: unknown, field: string): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new ApiError(`The API returned an invalid reservation ${field}.`);
  }
  return parsed;
}

function nullableString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') {
    throw new ApiError(`The API returned an invalid reservation ${field}.`);
  }
  return value;
}

function parseReservation(value: unknown): Reservation {
  if (!isRecord(value)) {
    throw new ApiError('The API returned an invalid reservation.');
  }

  if (typeof value.user_id !== 'string') {
    throw new ApiError('The API returned an invalid reservation borrower.');
  }

  return {
    id: toNumber(value.id, 'ID'),
    item_id:
      value.item_id === null || value.item_id === undefined
        ? null
        : toNumber(value.item_id, 'item ID'),
    item_unit_id: toNumber(value.item_unit_id, 'unit ID'),
    item_name: nullableString(value.item_name, 'item name'),
    user_id: value.user_id,
    borrow_date: nullableString(value.borrow_date, 'borrow date'),
    actual_return_date: nullableString(
      value.actual_return_date,
      'return date',
    ),
    course_name: nullableString(value.course_name, 'course name'),
    lab_name: nullableString(value.lab_name, 'lab name'),
  };
}

function parseReservationPage(value: unknown): ReservationPage {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new ApiError('The API returned an invalid reservations response.');
  }
  const total = Number(value.total);
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new ApiError('The API returned an invalid reservations total.');
  }
  return { data: value.data.map(parseReservation), total };
}

export async function getMyReservationsApi(
  page: number,
  limit: number,
): Promise<ReservationPage> {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const response = await client.get(`/api/reservations/me?${query.toString()}`);
  return parseReservationPage(response);
}

export async function getAvailableKitsApi(): Promise<AvailableKit[]> {
  const response = await client.get('/api/reservations/kits');
  if (!isRecord(response) || !Array.isArray(response.data)) {
    throw new ApiError('The API returned an invalid available kits response.');
  }
  return response.data.map((value) => {
    if (
      !isRecord(value)
      || (value.status !== 'Available' && value.status !== 'Needs Checking')
      || typeof value.item_name !== 'string'
      || typeof value.kit_type_name !== 'string'
    ) {
      throw new ApiError('The API returned an invalid available kit.');
    }
    return {
      unit_id: toNumber(value.unit_id, 'kit unit ID'),
      status: value.status,
      item_name: value.item_name,
      kit_type_id: toNumber(value.kit_type_id, 'kit type ID'),
      kit_type_name: value.kit_type_name,
      slot_count: toNumber(value.slot_count, 'slot count'),
    };
  });
}

export async function borrowItemApi(
  scannedItemUnitId: number,
  imageB64?: string,
  kitScanId?: number,
  singleScanId?: number,
): Promise<void> {
  const body: {
    scanned_item_unit_id: number;
    image_b64?: string;
    kit_scan_id?: number;
    single_scan_id?: number;
  } = {
    scanned_item_unit_id: scannedItemUnitId,
  };
  if (imageB64 !== undefined) body.image_b64 = imageB64;
  if (kitScanId !== undefined) body.kit_scan_id = kitScanId;
  if (singleScanId !== undefined) body.single_scan_id = singleScanId;
  await client.post('/api/reservations', body);
}

export async function returnItemApi(
  reservationId: number,
  itemUnitId: number,
  scannedItemUnitId: number,
  imageB64?: string,
): Promise<void> {
  const body: {
    item_unit_id: number;
    scanned_item_unit_id: number;
    image_b64?: string;
  } = {
    item_unit_id: itemUnitId,
    scanned_item_unit_id: scannedItemUnitId,
  };
  if (imageB64 !== undefined) body.image_b64 = imageB64;
  await client.patch(`/api/reservations/${reservationId}/return`, body);
}

export async function verifyKitFrameApi(
  kitUnitId: number,
  imageB64: string,
  signal: AbortSignal,
  persistScan = false,
): Promise<KitScanResult> {
  const response = await client.postWithSignal(
    '/api/reservations/scan-frame/kit',
    { kit_unit_id: kitUnitId, image_b64: imageB64, persist_scan: persistScan },
    signal,
  );
  return parseKitScanResult(unwrapScanResult(response));
}

export async function verifySingleFrameApi(
  itemUnitId: number,
  imageB64: string,
  signal: AbortSignal,
  persistScan = false,
): Promise<SingleScanResult> {
  const response = await client.postWithSignal(
    '/api/reservations/scan-frame/single',
    { item_unit_id: itemUnitId, image_b64: imageB64, persist_scan: persistScan },
    signal,
  );
  return parseSingleScanResult(unwrapScanResult(response));
}
