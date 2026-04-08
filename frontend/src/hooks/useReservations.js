import { useState, useEffect, useCallback } from 'react'
import { getMyReservationsApi, getAllReservationsApi } from '../api/reservation.api.js'

export function useReservations(role) {
  const [data,    setData]    = useState([])
  const [page,    setPage]    = useState(1)
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const LIMIT = 20

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = role === 'admin'
        ? await getAllReservationsApi(page, LIMIT)
        : await getMyReservationsApi(page, LIMIT)
      setData(res.data)
      setTotal(res.total)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [role, page])

  useEffect(() => { fetch() }, [fetch])

  return { data, page, setPage, total, limit: LIMIT, loading, error, refetch: fetch }
}
