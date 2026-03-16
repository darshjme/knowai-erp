import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import { Suspense, lazy } from 'react';
import store from './store/store';
import MainLayout from './components/layout/MainLayout';
import Loader from './components/ui/Loader';

// Auth Pages (eager)
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';

// Lazy loaded pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const HrDashboard = lazy(() => import('./pages/HrDashboard'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Team = lazy(() => import('./pages/Team'));
const Payroll = lazy(() => import('./pages/Payroll'));
const Leaves = lazy(() => import('./pages/Leaves'));
const Hiring = lazy(() => import('./pages/Hiring'));
const Documents = lazy(() => import('./pages/Documents'));
const Complaints = lazy(() => import('./pages/Complaints'));
const Clients = lazy(() => import('./pages/Clients'));
const Leads = lazy(() => import('./pages/Leads'));
const Invoices = lazy(() => import('./pages/Invoices'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Chat = lazy(() => import('./pages/Chat'));
const EmailClient = lazy(() => import('./pages/EmailClient'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Files = lazy(() => import('./pages/Files'));
const Docs = lazy(() => import('./pages/Docs'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const PersonalityTest = lazy(() => import('./pages/PersonalityTest'));
const Notifications = lazy(() => import('./pages/Notifications'));
const TimeTracking = lazy(() => import('./pages/TimeTracking'));
const Goals = lazy(() => import('./pages/Goals'));
const PasswordManager = lazy(() => import('./pages/PasswordManager'));
const Subscriptions = lazy(() => import('./pages/Subscriptions'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));

import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';
import 'react-datepicker/dist/react-datepicker.css';
import './assets/scss/main.scss';

function ProtectedRoute({ children }) {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((s) => s.auth);

  // Restore session from localStorage on page refresh
  if (!isAuthenticated) {
    const saved = localStorage.getItem('knowai-user');
    if (saved) {
      try {
        const restoredUser = JSON.parse(saved);
        dispatch({ type: 'AUTH_SUCCESS', payload: restoredUser });
        // Redirect to onboarding if not completed
        if (restoredUser.onboardingComplete === false) {
          return <Navigate to="/onboarding" replace />;
        }
        return children;
      } catch {}
    }
    return <Navigate to="/login" replace />;
  }

  // Redirect authenticated users who haven't completed onboarding
  if (user && user.onboardingComplete === false) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="hr-dashboard" element={<HrDashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="team" element={<Team />} />
          <Route path="payroll" element={<Payroll />} />
          <Route path="leaves" element={<Leaves />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="hiring" element={<Hiring />} />
          <Route path="documents" element={<Documents />} />
          <Route path="complaints" element={<Complaints />} />
          <Route path="clients" element={<Clients />} />
          <Route path="leads" element={<Leads />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="chat" element={<Chat />} />
          <Route path="email" element={<EmailClient />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="files" element={<Files />} />
          <Route path="docs" element={<Docs />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="time-tracking" element={<TimeTracking />} />
          <Route path="goals" element={<Goals />} />
          <Route path="profile" element={<UserProfile />} />
          <Route path="profile/:id" element={<UserProfile />} />
          <Route path="passwords" element={<PasswordManager />} />
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="personality-test" element={<PersonalityTest />} />
          <Route path="admin" element={<AdminPanel />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppRoutes />
        <ToastContainer position="top-right" theme="colored" autoClose={3000} />
      </BrowserRouter>
    </Provider>
  );
}
