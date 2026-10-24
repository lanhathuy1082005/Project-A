import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '@/api/client';
import { getMyTimetableApi, type TimetableClass } from '@/api/timetable.api';

export function useStudentTimetable() {
  const [classes, setClasses] = useState<TimetableClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setClasses(await getMyTimetableApi());
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, 'Could not load your weekly timetable.'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getMyTimetableApi()
      .then((result) => {
        if (active) setClasses(result);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            getErrorMessage(
              requestError,
              'Could not load your weekly timetable.',
            ),
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { classes, loading, error, refetch };
}
