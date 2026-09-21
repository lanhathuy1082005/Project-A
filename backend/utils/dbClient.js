import { AppError } from './AppError.js'

const BASE = process.env.DB_SERVICE_URL ?? 'http://localhost:8001'

const request = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body:    body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  const data = text ? JSON.parse(text) : null

  // Not-found is a normal outcome for lookups/mutations in this codebase —
  // callers check `if (!result)` rather than catching an exception.
  if (res.status === 404) return null

  if (!res.ok) throw new AppError(data?.detail ?? `DB service request failed (${res.status})`, res.status)
  return data
}

const qs = (params) => {
  const entries = Object.entries(params ?? {}).filter(([, v]) => v !== null && v !== undefined)
  if (!entries.length) return ''
  return '?' + new URLSearchParams(entries).toString()
}

export const db = {
  get:    (path, params)  => request('GET',    `${path}${qs(params)}`),
  post:   (path, body)    => request('POST',   path, body),
  put:    (path, body)    => request('PUT',    path, body),
  delete: (path)          => request('DELETE', path),
}
