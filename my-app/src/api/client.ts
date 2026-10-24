export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getResponseMessage(value: unknown, fallback: string): string {
  if (isRecord(value) && typeof value.message === 'string') {
    return value.message;
  }
  return fallback;
}

function getApiBaseUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!configuredUrl) {
    throw new ApiError(
      'EXPO_PUBLIC_API_URL is not set. Configure it in my-app/.env and restart Expo.',
    );
  }
  return configuredUrl.replace(/\/+$/, '');
}

async function request(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: object,
): Promise<unknown> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const responseText = await response.text();
  let responseBody: unknown;

  if (responseText) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      if (response.ok) {
        throw new ApiError('The API returned an invalid response.', response.status);
      }
    }
  }

  if (!response.ok) {
    throw new ApiError(
      getResponseMessage(responseBody, `Request failed (${response.status}).`),
      response.status,
    );
  }

  return responseBody;
}

export const client = {
  get: (path: string) => request('GET', path),
  post: (path: string, body: object) =>
    request('POST', path, body),
  patch: (path: string, body: object) =>
    request('PATCH', path, body),
};

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
