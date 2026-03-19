import { useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';

/**
 * useNotificationStream — connects to SSE /api/events for real-time notifications.
 *
 *   Browser (EventSource) ──► /api/events ──► SSE stream
 *        │                                        │
 *        └── onmessage ◄──── event: notifications ─┘
 *              │
 *              ▼
 *        dispatch(NOTIFS_ADD) → Redux → UI re-renders
 *
 * Features:
 * - Auto-reconnect on connection loss (exponential backoff, max 30s)
 * - Dispatches NOTIFS_ADD to Redux for bell badge + toast
 * - Cleans up on unmount
 */
export function useNotificationStream() {
  const dispatch = useDispatch();
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectDelayRef = useRef(1000);

  const connect = useCallback(() => {
    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource('/api/events', { withCredentials: true });
    eventSourceRef.current = es;

    es.addEventListener('connected', () => {
      // Reset reconnect delay on successful connection
      reconnectDelayRef.current = 1000;
    });

    es.addEventListener('notifications', (event) => {
      try {
        const notifications = JSON.parse(event.data);
        if (notifications.length > 0) {
          dispatch({ type: 'NOTIFS_ADD', payload: notifications });
        }
      } catch {
        // Ignore malformed events
      }
    });

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;

      // Exponential backoff reconnect (max 30 seconds)
      const delay = reconnectDelayRef.current;
      reconnectDelayRef.current = Math.min(delay * 2, 30000);

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };
  }, [dispatch]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);
}
