import { useEffect } from 'react';
import { useDispatch } from 'react-redux';

/**
 * Sets the page title in Redux (UI_SET_PAGE_TITLE) and updates document.title.
 *
 * Usage:
 *   usePageTitle('Projects');
 */
export default function usePageTitle(title) {
  const dispatch = useDispatch();

  useEffect(() => {
    if (title) {
      dispatch({ type: 'UI_SET_PAGE_TITLE', payload: title });
      document.title = `${title} | Know AI ERP`;
    }
  }, [title, dispatch]);
}
