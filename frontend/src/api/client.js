const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

const request = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers:     body ? { 'Content-Type': 'application/json' } : {},
    body:        body ? JSON.stringify(body) : undefined,
  })

  // Some responses have no body (204)
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}

  if (!res.ok) {
    const err = new Error(data.message ?? `Request failed (${res.status})`)
    err.status = res.status   // preserve HTTP status so callers can branch on 500 vs others
    throw err
  }
  return data
}

export const client = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  patch:  (path, body)  => request('PATCH',  path, body),
  delete: (path)        => request('DELETE', path),
}
