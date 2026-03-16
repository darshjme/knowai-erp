import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';

/**
 * Generic data-fetching hook for Know AI ERP.
 *
 * @param {Function} apiFn   - An async function that returns an Axios response.
 * @param {*}        params  - Arguments forwarded to apiFn (single value, array, or object).
 * @param {Object}   options
 * @param {boolean}  options.immediate  - Fetch on mount (default true).
 * @param {boolean}  options.showError  - Show toast on error (default true).
 * @param {Function} options.onSuccess  - Callback after successful fetch.
 * @param {Function} options.onError    - Callback after failed fetch.
 *
 * Returns: { data, loading, error, refetch }
 */
export default function useApi(apiFn, params, options = {}) {
  const {
    immediate = true,
    showError = true,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  // Keep latest callbacks without causing re-fetches
  const callbacksRef = useRef({ onSuccess, onError });
  callbacksRef.current = { onSuccess, onError };

  // Serialise params so we can use it as a dependency
  const paramsKey = JSON.stringify(params);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const args = Array.isArray(params) ? params : params !== undefined ? [params] : [];
      const res = await apiFn(...args);
      const payload = res.data ?? res;
      setData(payload);
      callbacksRef.current.onSuccess?.(payload);
      return payload;
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || 'Something went wrong';
      setError(message);
      if (showError) {
        toast.error(message);
      }
      callbacksRef.current.onError?.(err);
      return null;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiFn, paramsKey, showError]);

  // Auto-fetch on mount (and when params change)
  useEffect(() => {
    if (immediate) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, immediate]);

  return { data, loading, error, refetch: fetchData };
}
