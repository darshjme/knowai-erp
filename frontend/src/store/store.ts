import { createStore, combineReducers, applyMiddleware } from 'redux';
import { thunk } from 'redux-thunk';

// Auth reducer
const authInitial = {
  user: null,
  token: null,
  loading: false,
  error: null,
  isAuthenticated: false,
};

function authReducer(state = authInitial, action) {
  switch (action.type) {
    case 'AUTH_LOADING': return { ...state, loading: true, error: null };
    case 'AUTH_SUCCESS': return { ...state, loading: false, user: action.payload, isAuthenticated: true, error: null };
    case 'AUTH_FAIL': return { ...state, loading: false, error: action.payload, isAuthenticated: false };
    case 'AUTH_LOGOUT': return { ...authInitial };
    case 'AUTH_UPDATE_USER': return { ...state, user: { ...state.user, ...action.payload } };
    default: return state;
  }
}

// Notifications reducer
const notifsInitial = { items: [], unreadCount: 0 };

function notificationsReducer(state = notifsInitial, action) {
  switch (action.type) {
    case 'NOTIFS_SET': return { ...state, items: action.payload, unreadCount: action.payload.filter(n => !n.read).length };
    case 'NOTIFS_MARK_READ': return { ...state, items: state.items.map(n => n.id === action.payload ? { ...n, read: true } : n), unreadCount: Math.max(0, state.unreadCount - 1) };
    case 'NOTIFS_ADD': {
      const newItems = Array.isArray(action.payload) ? action.payload : [action.payload];
      // Deduplicate by id — SSE may send items we already have
      const existingIds = new Set(state.items.map(n => n.id));
      const unique = newItems.filter(n => !existingIds.has(n.id));
      if (unique.length === 0) return state;
      return { ...state, items: [...unique, ...state.items], unreadCount: state.unreadCount + unique.length };
    }
    default: return state;
  }
}

// UI reducer
const uiInitial = {
  sidebarCollapsed: false,
  sidebarMobileOpen: false,
  rightPanelCollapsed: localStorage.getItem('knowai-right-panel-collapsed') === 'true',
  theme: localStorage.getItem('knowai-theme') || 'dark',
  pageTitle: 'Dashboard',
};

function uiReducer(state = uiInitial, action) {
  switch (action.type) {
    case 'UI_TOGGLE_SIDEBAR': return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case 'UI_SET_SIDEBAR_COLLAPSED': return { ...state, sidebarCollapsed: !!action.payload };
    case 'UI_TOGGLE_MOBILE_SIDEBAR': return { ...state, sidebarMobileOpen: !state.sidebarMobileOpen };
    case 'UI_CLOSE_MOBILE_SIDEBAR': return { ...state, sidebarMobileOpen: false };
    case 'UI_TOGGLE_RIGHT_PANEL': {
      const next = !state.rightPanelCollapsed;
      localStorage.setItem('knowai-right-panel-collapsed', String(next));
      return { ...state, rightPanelCollapsed: next };
    }
    case 'UI_SET_THEME': {
      localStorage.setItem('knowai-theme', action.payload);
      // Toggle 'light' class on <html> for Tailwind dark mode
      if (action.payload === 'light') {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }
      document.documentElement.setAttribute('data-theme', action.payload);
      return { ...state, theme: action.payload };
    }
    case 'UI_SET_PAGE_TITLE': return { ...state, pageTitle: action.payload };
    default: return state;
  }
}

const rootReducer = combineReducers({
  auth: authReducer,
  notifications: notificationsReducer,
  ui: uiReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

const store = createStore(rootReducer, applyMiddleware(thunk));

export type AppDispatch = typeof store.dispatch;

export default store;
