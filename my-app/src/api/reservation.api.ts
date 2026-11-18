import { ApiError, client } from './client';

export type ReturnFlag = 'unsure' | 'wrong' | 'count_mismatch' | 'scan_unavailable';
export type ScanPurpose = 'checkout' | 'return';

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
  kit_type_id: number | null;
  return_flag: ReturnFlag | null;
}

export interface ReservationPage {
  data: Reservation[];
  total: number;
}

export interface ResolvedUnit {
  item_unit_id: number;
  is_kit: boolean;
  item_name: string;
  status: string;
  slot_count: number | null;
}

export type ScanStatus = 'success' | 'missing' | 'wrong' | 'unsure';
export type SingleScanStatus = 'success' | 'wrong' | 'unsure';

interface FrameOutcome {
  item_unit_id: number;
  purpose: ScanPurpose;
  // Checkout: this frame may be borrowed with. Return: this frame would not be flagged.
  confirmable: boolean;
  return_flag: ReturnFlag | null;
  model_version: string;
  confidence_threshold: number;
}

export interface KitScanResult extends FrameOutcome {
  expected_slots: number;
  empty_count: number;
  sensor_count: number;
  two_sensor_count: number;
  status: ScanStatus;
  confidence: number;
  fully_empty: boolean;
  kit_scan_id: number | null;
}

export interface SingleScanResult extends FrameOutcome {
  status: SingleScanStatus;
  detected_item_class: string | null;
  item_confidence: number | null;
  qr_confidence: number | null;
  single_scan_id: number | null;
}

export interface AvailableKit {
  unit_id: number;
  status: string;
  item_name: string;
  kit_type_id: number;
  kit_type_name: string;
  slot_count: number;
}

export interface AvailableKits {
  kits: AvailableKit[];
  // false: students pick the kit from the list (no kit QR stickers yet)
  kitQrRequired: boolean;
}

// What the scanner hands to the borrow / return screen. With no scan id on a return,
// the server closes the loan flagged as scan_unavailable. qrText is absent for a kit
// picked from the list and for kit returns (checked by contents only).
export interface ScanConfirmation {
  qrText?: string;
  unitId: number;
  isKit: boolean;
  kitScanId?: number;
  singleScanId?: number;
  returnFlag: ReturnFlag | null;
}

export const RETURN_FLAG_LABELS: Record<ReturnFlag, string> = {
  unsure: 'the scan was not clear enough',
  wrong: 'the scan did not match the item',
  count_mismatch: 'the kit contents differ from when it was borrowed',
  scan_unavailable: 'the item could not be scanned',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const RETURN_FLAGS: ReadonlySet<string> = new Set([
  'unsure', 'wrong', 'count_mismatch', 'scan_unavailable',
]);
const KIT_STATUSES: ReadonlySet<string> = new Set(['success', 'missing', 'wrong', 'unsure']);
const SINGLE_STATUSES: ReadonlySet<string> = new Set(['success', 'wrong', 'unsure']);

function invalid(what: string): never {
  throw new ApiError(`The API returned an invalid ${what}.`);
}

function positiveInt(value: unknown, what: string): number {
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (typeof parsed !== 'number' || !Number.isSafeInteger(parsed) || parsed < 1) invalid(what);
  return parsed;
}

function count(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) invalid(what);
  return value;
}

function unit(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) invalid(what);
  return value;
}

function nullable<T>(value: unknown, parse: (v: unknown) => T): T | null {
  return value === null || value === undefined ? null : parse(value);
}

function nullableString(value: unknown, what: string): string | null {
  return nullable(value, (v) => (typeof v === 'string' ? v : invalid(what)));
}

function returnFlag(value: unknown): ReturnFlag | null {
  return nullable(value, (v) =>
    typeof v === 'string' && RETURN_FLAGS.has(v) ? (v as ReturnFlag) : invalid('return flag'));
}

function data(response: unknown, what: string): unknown {
  if (!isRecord(response) || !('data' in response)) invalid(what);
  return response.data;
}

function parseOutcome(value: Record<string, unknown>): FrameOutcome {
  if (value.purpose !== 'checkout' && value.purpose !== 'return') invalid('scan purpose');
  if (typeof value.confirmable !== 'boolean') invalid('scan result');
  if (typeof value.model_version !== 'string') invalid('scan model version');
  return {
    item_unit_id: positiveInt(value.item_unit_id, 'scan unit'),
    purpose: value.purpose,
    confirmable: value.confirmable,
    return_flag: returnFlag(value.return_flag),
    model_version: value.model_version,
    confidence_threshold: unit(value.confidence_threshold, 'confidence threshold'),
  };
}

function parseKitScanResult(value: unknown): KitScanResult {
  if (!isRecord(value) || typeof value.status !== 'string' || !KIT_STATUSES.has(value.status))
    invalid('kit scan result');
  if (typeof value.fully_empty !== 'boolean') invalid('kit scan result');
  return {
    ...parseOutcome(value),
    expected_slots: positiveInt(value.expected_slots, 'kit slot count'),
    empty_count: count(value.empty_count, 'empty count'),
    sensor_count: count(value.sensor_count, 'sensor count'),
    two_sensor_count: count(value.two_sensor_count, '2xsensor count'),
    status: value.status as ScanStatus,
    confidence: unit(value.confidence, 'kit confidence'),
    fully_empty: value.fully_empty,
    kit_scan_id: nullable(value.kit_scan_id, (v) => positiveInt(v, 'kit scan ID')),
  };
}

function parseSingleScanResult(value: unknown): SingleScanResult {
  if (!isRecord(value) || typeof value.status !== 'string' || !SINGLE_STATUSES.has(value.status))
    invalid('single-item scan result');
  return {
    ...parseOutcome(value),
    status: value.status as SingleScanStatus,
    detected_item_class: nullableString(value.detected_item_class, 'detected item class'),
    item_confidence: nullable(value.item_confidence, (v) => unit(v, 'item confidence')),
    qr_confidence: nullable(value.qr_confidence, (v) => unit(v, 'QR confidence')),
    single_scan_id: nullable(value.single_scan_id, (v) => positiveInt(v, 'single scan ID')),
  };
}

function parseReservation(value: unknown): Reservation {
  if (!isRecord(value)) invalid('reservation');
  if (typeof value.user_id !== 'string') invalid('reservation borrower');
  return {
    id: positiveInt(value.id, 'reservation ID'),
    item_id: nullable(value.item_id, (v) => positiveInt(v, 'item ID')),
    item_unit_id: positiveInt(value.item_unit_id, 'unit ID'),
    item_name: nullableString(value.item_name, 'item name'),
    user_id: value.user_id,
    borrow_date: nullableString(value.borrow_date, 'borrow date'),
    actual_return_date: nullableString(value.actual_return_date, 'return date'),
    course_name: nullableString(value.course_name, 'course name'),
    lab_name: nullableString(value.lab_name, 'lab name'),
    kit_type_id: nullable(value.kit_type_id, (v) => positiveInt(v, 'kit type ID')),
    return_flag: returnFlag(value.return_flag),
  };
}

function parseReservationPage(value: unknown): ReservationPage {
  if (!isRecord(value) || !Array.isArray(value.data)) invalid('reservations response');
  const total = Number(value.total);
  if (!Number.isSafeInteger(total) || total < 0) invalid('reservations total');
  return { data: value.data.map(parseReservation), total };
}

export async function getMyReservationsApi(page: number, limit: number): Promise<ReservationPage> {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  return parseReservationPage(await client.get(`/api/reservations/me?${query.toString()}`));
}

export async function resolveUnitApi(qrText: string): Promise<ResolvedUnit> {
  const value = data(await client.post('/api/units/resolve', { qr_text: qrText }), 'unit');
  if (
    !isRecord(value)
    || typeof value.is_kit !== 'boolean'
    || typeof value.item_name !== 'string'
    || typeof value.status !== 'string'
  ) invalid('unit');
  return {
    item_unit_id: positiveInt(value.item_unit_id, 'unit ID'),
    is_kit: value.is_kit,
    item_name: value.item_name,
    status: value.status,
    slot_count: nullable(value.slot_count, (v) => positiveInt(v, 'slot count')),
  };
}

export async function getAvailableKitsApi(): Promise<AvailableKits> {
  const response = await client.get('/api/reservations/kits');
  if (!isRecord(response) || !Array.isArray(response.data) || typeof response.kit_qr_required !== 'boolean')
    invalid('available kits response');
  return {
    kitQrRequired: response.kit_qr_required,
    kits: response.data.map((value) => {
      if (
        !isRecord(value)
        || typeof value.status !== 'string'
        || typeof value.item_name !== 'string'
        || typeof value.kit_type_name !== 'string'
      ) invalid('available kit');
      return {
        unit_id: positiveInt(value.unit_id, 'kit unit ID'),
        status: value.status,
        item_name: value.item_name,
        kit_type_id: positiveInt(value.kit_type_id, 'kit type ID'),
        kit_type_name: value.kit_type_name,
        slot_count: positiveInt(value.slot_count, 'slot count'),
      };
    }),
  };
}

export interface FrameRequest {
  // Exactly one way to identify the unit: the scanned QR text, a kit picked from the
  // list (checkout), or the loan being returned (kit returns need nothing else).
  qrText?: string;
  kitUnitId?: number;
  imageB64: string;
  purpose: ScanPurpose;
  reservationId?: number;
  persist: boolean;
}

const frameBody = (request: FrameRequest) => ({
  ...(request.qrText !== undefined ? { qr_text: request.qrText } : {}),
  ...(request.kitUnitId !== undefined ? { kit_unit_id: request.kitUnitId } : {}),
  image_b64: request.imageB64,
  purpose: request.purpose,
  ...(request.reservationId !== undefined ? { reservation_id: request.reservationId } : {}),
  persist_scan: request.persist,
});

export async function verifyKitFrameApi(
  request: FrameRequest,
  signal: AbortSignal,
): Promise<KitScanResult> {
  const response = await client.postWithSignal(
    '/api/reservations/scan-frame/kit', frameBody(request), signal,
  );
  return parseKitScanResult(data(response, 'scan response'));
}

export async function verifySingleFrameApi(
  request: FrameRequest,
  signal: AbortSignal,
): Promise<SingleScanResult> {
  const response = await client.postWithSignal(
    '/api/reservations/scan-frame/single', frameBody(request), signal,
  );
  return parseSingleScanResult(data(response, 'scan response'));
}

const scanIds = (confirmation: ScanConfirmation) => ({
  ...(confirmation.qrText !== undefined ? { qr_text: confirmation.qrText } : {}),
  ...(confirmation.kitScanId !== undefined ? { kit_scan_id: confirmation.kitScanId } : {}),
  ...(confirmation.singleScanId !== undefined ? { single_scan_id: confirmation.singleScanId } : {}),
});

export async function borrowItemApi(confirmation: ScanConfirmation): Promise<void> {
  await client.post('/api/reservations', {
    ...scanIds(confirmation),
    // A kit picked from the list is identified by its unit id.
    ...(confirmation.isKit && confirmation.qrText === undefined ? { kit_unit_id: confirmation.unitId } : {}),
  });
}

export async function returnItemApi(
  reservationId: number,
  confirmation: ScanConfirmation,
): Promise<{ returnFlag: ReturnFlag | null }> {
  const response = await client.patch(
    `/api/reservations/${reservationId}/return`, scanIds(confirmation),
  );
  const value = data(response, 'return response');
  if (!isRecord(value)) invalid('return response');
  return { returnFlag: returnFlag(value.return_flag) };
}
