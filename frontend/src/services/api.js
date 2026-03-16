import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Auto-unwrap backend {success, data} wrapper so pages get clean data
api.interceptors.response.use(
  (res) => {
    // If backend returns {success: true, data: ...}, unwrap it
    if (res.data && typeof res.data === 'object' && 'success' in res.data && 'data' in res.data) {
      res.data = res.data.data;
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('knowai-user');
      localStorage.removeItem('knowai-authenticated');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    // Unwrap error message from backend
    if (err.response?.data?.error) {
      err.message = err.response.data.error;
    }
    return Promise.reject(err);
  }
);

// Auth
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  signup: (data) => api.post('/auth/signup', data),
  logout: () => api.post('/auth/logout'),
};

// Onboarding
export const onboardingApi = {
  getStatus: () => api.get('/onboarding'),
  complete: (formData) => api.post('/onboarding', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// Dashboard
export const dashboardApi = {
  getStats: () => api.get('/dashboard'),
  getHrStats: () => api.get('/hr'),
};

// Projects
export const projectsApi = {
  list: (params) => api.get('/projects', { params }),
  get: (id) => api.get(`/projects?id=${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.patch('/projects', { id, ...data }),
  delete: (id) => api.delete(`/projects?id=${id}`),
};

// Tasks
export const tasksApi = {
  list: (params) => api.get('/tasks', { params }),
  get: (id) => api.get(`/tasks?id=${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.patch('/tasks', { id, ...data }),
  delete: (id) => api.delete(`/tasks?id=${id}`),
};

// Team
export const teamApi = {
  list: (params) => api.get('/team', { params }),
  get: (id) => api.get(`/team?id=${id}`),
  create: (data) => api.post('/team', data),
  update: (id, data) => api.patch('/team', { id, ...data }),
  delete: (id) => api.delete(`/team?id=${id}`),
};

// Payroll
export const payrollApi = {
  list: (params) => api.get('/payroll', { params }),
  get: (id) => api.get(`/payroll?id=${id}`),
  create: (data) => api.post('/payroll', data),
  update: (id, data) => api.patch('/payroll', { id, ...data }),
  delete: (id) => api.delete(`/payroll?id=${id}`),
  addLog: (data) => api.post('/payroll', { action: 'addLog', ...data }),
};

// Leaves
export const leavesApi = {
  list: (params) => api.get('/leaves', { params }),
  create: (data) => api.post('/leaves', data),
  update: (id, data) => api.patch('/leaves', { id, ...data }),
  delete: (id) => api.delete(`/leaves?id=${id}`),
};

// Expenses
export const expensesApi = {
  list: (params) => api.get('/expenses', { params }),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.patch('/expenses', { id, ...data }),
  delete: (id) => api.delete(`/expenses?id=${id}`),
};

// Hiring
export const hiringApi = {
  listJobs: (params) => api.get('/hiring', { params }),
  createJob: (data) => api.post('/hiring', { action: 'createJob', ...data }),
  addCandidate: (data) => api.post('/hiring', { action: 'addCandidate', ...data }),
  advanceCandidate: (data) => api.post('/hiring', { action: 'advanceCandidate', ...data }),
  addInterview: (data) => api.post('/hiring', { action: 'addInterview', ...data }),
  update: (id, data) => api.patch('/hiring', { id, ...data }),
  delete: (id) => api.delete(`/hiring?id=${id}`),
};

// Clients
export const clientsApi = {
  list: (params) => api.get('/clients', { params }),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.patch('/clients', { id, ...data }),
  delete: (id) => api.delete(`/clients?id=${id}`),
};

// Leads
export const leadsApi = {
  list: (params) => api.get('/leads', { params }),
  create: (data) => api.post('/leads', data),
  update: (id, data) => api.patch('/leads', { id, ...data }),
  delete: (id) => api.delete(`/leads?id=${id}`),
};

// Invoices
export const invoicesApi = {
  list: (params) => api.get('/invoices', { params }),
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.patch('/invoices', { id, ...data }),
  delete: (id) => api.delete(`/invoices?id=${id}`),
};

// Chat
export const chatApi = {
  getRooms: () => api.get('/chat?action=rooms'),
  getMessages: (roomId, page) => api.get(`/chat?action=messages&roomId=${roomId}&page=${page || 1}`),
  sendMessage: (data) => api.post('/chat', { action: 'send', ...data }),
  createRoom: (data) => api.post('/chat', { action: 'create-room', ...data }),
  getUsers: () => api.get('/chat?action=users'),
};

// Calendar
export const calendarApi = {
  list: (params) => api.get('/calendar', { params }),
  create: (data) => api.post('/calendar', data),
  update: (id, data) => api.patch('/calendar', { id, ...data }),
  delete: (id) => api.delete(`/calendar?id=${id}`),
};

// Email
export const emailApi = {
  list: (params) => api.get('/email', { params }),
  send: (data) => api.post('/email', data),
  getDashboard: () => api.get('/email-dashboard'),
};

// Files
export const filesApi = {
  list: (params) => api.get('/files', { params }),
  upload: (formData) => api.post('/files', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/files?id=${id}`),
  serve: (filename) => `/api/files/serve/${filename}`,
  preview: (id) => `/api/files/preview/${id}`,
};

// Notifications
export const notificationsApi = {
  list: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.post('/notifications', { id, read: true }),
};

// Documents
export const documentsApi = {
  list: (params) => api.get('/documents', { params }),
  upload: (data) => api.post('/documents', data),
  update: (id, data) => api.patch('/documents', { id, ...data }),
  delete: (id) => api.delete(`/documents?id=${id}`),
};

// Complaints
export const complaintsApi = {
  list: (params) => api.get('/complaints', { params }),
  file: (data) => api.post('/complaints', { action: 'file', ...data }),
  escalate: (id) => api.post('/complaints', { action: 'escalate', id }),
  resolve: (id, resolution) => api.post('/complaints', { action: 'resolve', id, resolution }),
};

// Goals
export const goalsApi = {
  list: (params) => api.get('/goals', { params }),
  create: (data) => api.post('/goals', data),
  update: (id, data) => api.patch('/goals', { id, ...data }),
  delete: (id) => api.delete(`/goals?id=${id}`),
};

// Time Tracking
export const timeTrackingApi = {
  list: (params) => api.get('/time-tracking', { params }),
  create: (data) => api.post('/time-tracking', data),
  update: (id, data) => api.patch('/time-tracking', { id, ...data }),
  delete: (id) => api.delete(`/time-tracking?id=${id}`),
};

// Accountability
export const accountabilityApi = {
  getAlerts: (scope) => api.get('/accountability', { params: { scope } }),
  sendNudge: (data) => api.post('/accountability', data),
};

// Personality Test
export const personalityTestApi = {
  getStatus: () => api.get('/personality-test'),
  submit: (data) => api.post('/personality-test', data),
};

// Reports
export const reportsApi = {
  get: (params) => api.get('/reports', { params }),
  getAnalytics: (params) => api.get('/analytics', { params }),
};

// Settings
export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data) => api.post('/settings', data),
  getPreferences: () => api.get('/settings/preferences'),
  updatePreferences: (data) => api.post('/settings/preferences', data),
};

// Audit
export const auditApi = {
  list: (params) => api.get('/audit', { params }),
};

// Docs
export const docsApi = {
  list: (params) => api.get('/docs', { params }),
  create: (data) => api.post('/docs', data),
  update: (id, data) => api.patch('/docs', { id, ...data }),
  delete: (id) => api.delete(`/docs?id=${id}`),
};

// Spaces
export const spacesApi = {
  list: () => api.get('/spaces'),
  create: (data) => api.post('/spaces', data),
};

// Credentials
export const credentialsApi = {
  list: (params) => api.get('/credentials', { params }),
  create: (data) => api.post('/credentials', data),
  update: (id, data) => api.patch('/credentials', { id, ...data }),
  delete: (id) => api.delete(`/credentials?id=${id}`),
  grantAccess: (data) => api.post('/credentials', { action: 'grantAccess', ...data }),
  revokeAccess: (data) => api.post('/credentials', { action: 'revokeAccess', ...data }),
  logAccess: (credentialId, accessAction) => api.post('/credentials', { action: 'logAccess', credentialId, accessAction }),
  getLogs: () => api.get('/credentials?action=logs'),
};

// Subscriptions
export const subscriptionsApi = {
  list: (params) => api.get('/subscriptions', { params }),
  create: (data) => api.post('/subscriptions', data),
  update: (id, data) => api.patch('/subscriptions', { id, ...data }),
  delete: (id) => api.delete(`/subscriptions?id=${id}`),
};

// HR Employee Analytics
export const employeeAnalyticsApi = {
  getTeamOverview: () => api.get('/hr/employee-analytics'),
  getEmployee: (userId) => api.get(`/hr/employee-analytics?userId=${userId}`),
};

// HR Password Management
export const passwordManagementApi = {
  list: () => api.get('/hr/password-management'),
  resetPassword: (userId) => api.post('/hr/password-management', { action: 'resetPassword', userId }),
  unlockAccount: (userId) => api.post('/hr/password-management', { action: 'unlockAccount', userId }),
  forceChangePassword: (userId) => api.post('/hr/password-management', { action: 'forceChangePassword', userId }),
};

// Change Requests (email/name changes - HR → CTO approval)
export const changeRequestApi = {
  list: (params) => api.get('/change-requests', { params }),
  submit: (data) => api.post('/change-requests', { action: 'submit', ...data }),
  hrApprove: (id, note) => api.post('/change-requests', { action: 'hr_approve', id, note }),
  hrReject: (id, note) => api.post('/change-requests', { action: 'hr_reject', id, note }),
  ctoApprove: (id, note) => api.post('/change-requests', { action: 'cto_approve', id, note }),
  ctoReject: (id, note) => api.post('/change-requests', { action: 'cto_reject', id, note }),
};

// Admin Panel
export const adminApi = {
  getConfig: () => api.get('/admin/config'),
  saveConfig: (data) => api.post('/admin/config', data),
  getStats: () => api.get('/admin/stats'),
  testEmail: (config) => api.post('/admin/config', { action: 'test_email', ...config }),
  testStorage: (config) => api.post('/admin/config', { action: 'test_storage', ...config }),
};

export default api;
