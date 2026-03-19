import { useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { authApi } from '../services/api';
import { ROLE_SIDEBAR_ACCESS } from '../utils/roleConfig';

const TOKEN_KEY = 'knowai-token';
const USER_KEY = 'knowai-user';

/**
 * Custom authentication hook for Know AI ERP.
 *
 * Returns:
 *   user            - current user object (or null)
 *   role            - shorthand for user.role
 *   isAuthenticated - boolean
 *   loading         - auth operation in progress
 *   login(email, password) - logs in and persists session
 *   logout()        - clears session
 *   hasPermission(page) - checks role against ROLE_SIDEBAR_ACCESS
 */
export default function useAuth() {
  const dispatch = useDispatch();
  const { user, isAuthenticated, loading } = useSelector((s) => s.auth);

  // ── Auto-check auth on mount ──────────────────────────
  useEffect(() => {
    const storedUser = localStorage.getItem(USER_KEY);
    const storedToken = localStorage.getItem(TOKEN_KEY);

    if (storedUser && storedToken && !isAuthenticated) {
      try {
        const parsed = JSON.parse(storedUser);
        dispatch({ type: 'AUTH_SUCCESS', payload: parsed });
      } catch {
        // Corrupted data — clear and let user log in again
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    // Run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Login ─────────────────────────────────────────────
  const login = useCallback(
    async (email, password) => {
      dispatch({ type: 'AUTH_LOADING' });
      try {
        const res = await authApi.login({ email, password });
        const userData = res.data.user || res.data;
        const token = res.data.token;

        // Persist to localStorage so session survives refresh
        if (token) localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));

        dispatch({ type: 'AUTH_SUCCESS', payload: userData });
        return { success: true, user: userData };
      } catch (err) {
        const message =
          err.response?.data?.message || err.message || 'Login failed';
        dispatch({ type: 'AUTH_FAIL', payload: message });
        return { success: false, error: message };
      }
    },
    [dispatch],
  );

  // ── Logout ────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Server may already have expired the session — that is fine
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    dispatch({ type: 'AUTH_LOGOUT' });
  }, [dispatch]);

  // ── Permission check ──────────────────────────────────
  const hasPermission = useCallback(
    (page) => {
      if (!user?.role) return false;
      const access = ROLE_SIDEBAR_ACCESS[user.role];
      // null means full access (e.g. ADMIN)
      if (access === null) return true;
      // undefined means unknown role — deny by default
      if (access === undefined) return false;
      return access.includes(page);
    },
    [user?.role],
  );

  return {
    user,
    role: user?.role ?? null,
    isAuthenticated,
    loading,
    login,
    logout,
    hasPermission,
  };
}
