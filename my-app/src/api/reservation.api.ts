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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
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

export async function borrowItemApi(scannedItemUnitId: number): Promise<void> {
  await client.post('/api/reservations', {
    scanned_item_unit_id: scannedItemUnitId,
  });
}

export async function returnItemApi(
  reservationId: number,
  itemUnitId: number,
  scannedItemUnitId: number,
): Promise<void> {
  await client.patch(`/api/reservations/${reservationId}/return`, {
    item_unit_id: itemUnitId,
    scanned_item_unit_id: scannedItemUnitId,
  });
}
