import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { ApiError, getErrorMessage } from '@/api/client';
import {
  fetchCurrentUser,
  loginApi,
  type AuthUser,
  type LoginCredentials,
} from '@/api/auth.api';
import { AuthContext } from './AuthContext';
import type { AuthStatus } from './AuthContext';

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const loadUser = useCallback(
    () =>
      fetchCurrentUser()
        .then((currentUser) => {
          setUser(currentUser);
          setError(null);
          setStatus('authenticated');
        })
        .catch((requestError: unknown) => {
          setUser(null);
          if (
            requestError instanceof ApiError &&
            requestError.status === 401
          ) {
            setError(null);
            setStatus('unauthenticated');
            return;
          }
          setError(
            getErrorMessage(
              requestError,
              'Could not check the current session.',
            ),
          );
          setStatus('error');
        }),
    [],
  );

  const refreshUser = useCallback(async () => {
    setStatus('loading');
    setError(null);
    await loadUser();
  }, [loadUser]);

  const signIn = useCallback(async (credentials: LoginCredentials) => {
    const signedInUser = await loginApi(credentials);
    setUser(signedInUser);
    setError(null);
    setStatus('authenticated');
    return signedInUser;
  }, []);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const value = useMemo(
    () => ({ user, status, error, signIn, refreshUser }),
    [user, status, error, signIn, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
