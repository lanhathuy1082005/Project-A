import { ApiError, client } from './client';

export type UserRole = 'student' | 'admin';

export interface AuthUser {
  id: string;
  role: UserRole;
}

export interface LoginCredentials {
  id: string;
  password: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseUser(value: unknown): AuthUser {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    (value.role !== 'student' && value.role !== 'admin')
  ) {
    throw new ApiError('The API returned an unsupported user or role.');
  }

  return { id: value.id, role: value.role };
}

function parseUserResponse(value: unknown): AuthUser {
  if (!isRecord(value)) {
    throw new ApiError('The API returned an invalid authentication response.');
  }
  return parseUser(value.user);
}

export async function loginApi(credentials: LoginCredentials): Promise<AuthUser> {
  const response = await client.post('/api/auth/login', credentials);
  return parseUserResponse(response);
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const response = await client.get('/api/auth/me');
  return parseUserResponse(response);
}
