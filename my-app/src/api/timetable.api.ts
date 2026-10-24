import { ApiError, client } from './client';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export interface TimetableClass {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  course_name: string;
}

function parseTimetableClass(value: unknown): TimetableClass {
  if (!isRecord(value)) {
    throw new ApiError('The API returned an invalid timetable class.');
  }

  const id = Number(value.id);
  const dayOfWeek = Number(value.day_of_week);
  const timePattern =
    /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?$/;

  if (
    !Number.isSafeInteger(id) ||
    id < 1 ||
    !Number.isInteger(dayOfWeek) ||
    dayOfWeek < 0 ||
    dayOfWeek > 6 ||
    typeof value.start_time !== 'string' ||
    !timePattern.test(value.start_time) ||
    typeof value.end_time !== 'string' ||
    !timePattern.test(value.end_time) ||
    typeof value.course_name !== 'string'
  ) {
    throw new ApiError('The API returned an invalid timetable class.');
  }

  return {
    id,
    day_of_week: dayOfWeek,
    start_time: value.start_time,
    end_time: value.end_time,
    course_name: value.course_name,
  };
}

export async function getMyTimetableApi(): Promise<TimetableClass[]> {
  const response = await client.get('/api/timetable/me');
  if (!isRecord(response) || !Array.isArray(response.data)) {
    throw new ApiError('The API returned an invalid timetable response.');
  }
  return response.data.map(parseTimetableClass);
}
