import { client } from './client.js'

const withPagination = (path, page = 1, limit = 20) =>
  `${path}?page=${page}&limit=${limit}`

// Dashboard
export const getDashboardApi = () =>
  client.get('/api/admin/dashboard')

// Classes
export const getClassesApi = (page, limit) =>
  client.get(withPagination('/api/admin/classes', page, limit))

export const getClassStudentsApi = (id) =>
  client.get(`/api/admin/classes/${id}/students`)

export const createClassApi = (data) =>
  client.post('/api/admin/classes', data)

export const updateClassApi = (id, data) =>
  client.patch(`/api/admin/classes/${id}`, data)

export const deleteClassApi = (id) =>
  client.delete(`/api/admin/classes/${id}`)

// Items (types)
export const getItemsApi = () =>
  client.get('/api/admin/items')

export const addItemApi = (data) =>
  client.post('/api/admin/items', data)

export const updateItemApi = (id, data) =>
  client.patch(`/api/admin/items/${id}`, data)

export const deleteItemApi = (id) =>
  client.delete(`/api/admin/items/${id}`)

// Item Units
export const getItemUnitsApi = (page, limit, status) => {
  let url = withPagination('/api/admin/item-units', page, limit)
  if (status) url += `&status=${status}`
  return client.get(url)
}

export const addItemUnitApi = (data) =>
  client.post('/api/admin/item-units', data)

export const updateItemUnitApi = (id, data) =>
  client.patch(`/api/admin/item-units/${id}`, data)

export const deleteItemUnitApi = (id) =>
  client.delete(`/api/admin/item-units/${id}`)

// Reservations (admin view with filters — merged page)
export const getAdminReservationsApi = (page, limit, filters = {}) => {
  let url = withPagination('/api/admin/reservations', page, limit)
  if (filters.status)    url += `&status=${filters.status}`
  if (filters.user_id)   url += `&user_id=${filters.user_id}`
  if (filters.class_id)  url += `&class_id=${filters.class_id}`
  if (filters.date_from) url += `&date_from=${filters.date_from}`
  if (filters.date_to)   url += `&date_to=${filters.date_to}`
  return client.get(url)
}

export const getReservationDetailApi = (id) =>
  client.get(`/api/admin/reservations/${id}`)

// Verification
export const getPendingReturnsApi = (page, limit) =>
  client.get(withPagination('/api/admin/pending-returns', page, limit))

export const verifyReturnApi = (id) =>
  client.patch(`/api/admin/reservations/${id}/verify`)

export const reportIssueApi = (id) =>
  client.patch(`/api/admin/reservations/${id}/report`)

// Logs
export const getLogsApi = (page, limit, filters = {}) => {
  let url = withPagination('/api/admin/logs', page, limit)
  if (filters.user_id) url += `&user_id=${filters.user_id}`
  if (filters.class_id) url += `&class_id=${filters.class_id}`
  if (filters.date_from) url += `&date_from=${filters.date_from}`
  if (filters.date_to) url += `&date_to=${filters.date_to}`
  return client.get(url)
}

// Lookups
export const getLabsApi = () =>
  client.get('/api/admin/labs')

export const getCoursesApi = () =>
  client.get('/api/admin/courses')

export const getLabChecklistApi = (labId) =>
  client.get(`/api/admin/labs/${labId}/checklist`)

// Feedback
export const getFeedbackApi = (page, limit) =>
  client.get(withPagination('/api/admin/feedback', page, limit))
