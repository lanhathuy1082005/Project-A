const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'


const request = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers:     body ? { 'Content-Type': 'application/json' } : {},
    body:        body ? JSON.stringify(body) : undefined,
  })

  // Some responses are without body (204), need handling
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}

  if (!res.ok) throw new Error(data.message ?? `Request failed (${res.status})`)
  return data
}

export const client = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  patch:  (path, body)  => request('PATCH',  path, body),
  delete: (path)        => request('DELETE', path),
}
