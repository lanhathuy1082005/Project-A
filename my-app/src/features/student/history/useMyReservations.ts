import { useCallback, useEffect, useState } from 'react';
import {
  getMyReservationsApi,
  type Reservation,
} from '@/api/reservation.api';
import { getErrorMessage } from '@/api/client';

const PAGE_SIZE = 20;

interface ReservationResult {
  page: number;
  requestVersion: number;
  data: Reservation[];
  total: number;
  error: string | null;
}

export function useMyReservations() {
  const [page, setPage] = useState(1);
  const [requestVersion, setRequestVersion] = useState(0);
  const [result, setResult] = useState<ReservationResult | null>(null);

  useEffect(() => {
    let active = true;

    getMyReservationsApi(page, PAGE_SIZE)
      .then((response) => {
        if (!active) return;
        const lastPage = Math.max(1, Math.ceil(response.total / PAGE_SIZE));
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setResult({
          page,
          requestVersion,
          data: response.data,
          total: response.total,
          error: null,
        });
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setResult({
          page,
          requestVersion,
          data: [],
          total: 0,
          error: getErrorMessage(
            requestError,
            'Could not load your reservation records.',
          ),
        });
      });

    return () => {
      active = false;
    };
  }, [page, requestVersion]);

  const refetch = useCallback(() => {
    setRequestVersion((current) => current + 1);
  }, []);

  const isCurrentResult =
    result?.page === page && result.requestVersion === requestVersion;

  return {
    data: isCurrentResult ? result.data : [],
    page,
    setPage,
    total: isCurrentResult ? result.total : 0,
    limit: PAGE_SIZE,
    loading: !isCurrentResult,
    error: isCurrentResult ? result.error : null,
    refetch,
  };
}
