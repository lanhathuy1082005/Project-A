import { client } from './client.js'

const withPagination = (path, page = 1, limit = 20) =>
  `${path}?page=${page}&limit=${limit}`

export const getMyReservationsApi = (page, limit) =>
  client.get(withPagination('/api/reservations/me', page, limit))

export const getAllReservationsApi = (page, limit) =>
  client.get(withPagination('/api/reservations', page, limit))

export const borrowItemApi = (scanned_item_unit_id) =>
  client.post('/api/reservations', { scanned_item_unit_id: scanned_item_unit_id })

export const returnItemApi = (reservationId, item_unit_id, scanned_item_unit_id) =>
  client.patch(`/api/reservations/${reservationId}/return`, { item_unit_id: item_unit_id, scanned_item_unit_id: scanned_item_unit_id })
